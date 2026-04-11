import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { requireHrManageMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { differenceInMinutes, parse } from "date-fns";

// ── Shared calculation logic (mirrors upsertAttendanceFn exactly) ──────────

function calculateHours(
    checkIn?: string | null,
    checkOut?: string | null,
): number {
    if (!checkIn || !checkOut) return 0;
    try {
        let start = parse(checkIn, "HH:mm:ss", new Date());
        if (isNaN(start.getTime())) start = parse(checkIn, "HH:mm", new Date());
        let end = parse(checkOut, "HH:mm:ss", new Date());
        if (isNaN(end.getTime())) end = parse(checkOut, "HH:mm", new Date());
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        let diff = differenceInMinutes(end, start);
        if (diff < 0) diff += 24 * 60; // overnight shift
        return diff / 60;
    } catch {
        return 0;
    }
}

function deriveDutyAndOvertime(
    status: string,
    standardHours: number,
    checkIn?: string | null,
    checkOut?: string | null,
    checkIn2?: string | null,
    checkOut2?: string | null,
): { dutyHours: string; overtimeHours: string; overtimeStatus: string } {
    if (status !== "present") {
        return { dutyHours: "0.00", overtimeHours: "0.00", overtimeStatus: "pending" };
    }

    const total = calculateHours(checkIn, checkOut) + calculateHours(checkIn2, checkOut2);

    if (total > 0) {
        if (total > standardHours) {
            const ot = +(total - standardHours).toFixed(2);
            return {
                dutyHours: standardHours.toFixed(2),
                overtimeHours: ot.toFixed(2),
                // New overtime auto-created → pending approval
                overtimeStatus: "pending",
            };
        }
        return {
            dutyHours: total.toFixed(2),
            overtimeHours: "0.00",
            overtimeStatus: "pending",
        };
    }

    // No times provided — use standard hours, no overtime
    return {
        dutyHours: standardHours.toFixed(2),
        overtimeHours: "0.00",
        overtimeStatus: "pending",
    };
}

// ── Schema ─────────────────────────────────────────────────────────────────

const bulkAttendanceSchema = z.object({
    /**
     * Which employees to mark.
     * Empty array = all active employees.
     */
    employeeIds: z.array(z.string()),

    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(), // YYYY-MM-DD

    template: z.object({
        status: z.enum(["present", "absent", "leave", "holiday"]),
        checkIn: z.string().nullable().optional(),
        checkOut: z.string().nullable().optional(),
        checkIn2: z.string().nullable().optional(),
        checkOut2: z.string().nullable().optional(),
        leaveType: z.enum(["sick", "annual", "special"]).nullable().optional(),
        notes: z.string().nullable().optional(),
        entrySource: z.enum(["biometric", "manual"]).default("manual"),
    }),

    /**
     * skip    — leave existing records completely untouched
     * overwrite — replace existing records with the template
     */
    conflictStrategy: z.enum(["skip", "overwrite"]).default("skip"),
});

// ── Handler ────────────────────────────────────────────────────────────────

export const bulkMarkAttendanceRangeFn = createServerFn()
    .middleware([requireHrManageMiddleware])
    .inputValidator(bulkAttendanceSchema)
    .handler(async ({ data }) => {
        const { startDate, endDate, template, conflictStrategy } = data;

        // ── 1. Resolve employees ──────────────────────────────────────────────
        const employeesList =
            data.employeeIds.length > 0
                ? await db.query.employees.findMany({
                    where: inArray(employees.id, data.employeeIds),
                })
                : await db.query.employees.findMany({
                    where: eq(employees.status, "active"),
                });

        if (employeesList.length === 0) throw new Error("No employees found.");

        const employeeIds = employeesList.map((e) => e.id);

        // Build per-employee rest day set for O(1) lookup
        const empRestDays = new Map<string, Set<number>>();
        for (const emp of employeesList) {
            const restDays: number[] = (emp.restDays as number[] | null) ?? [0];
            empRestDays.set(emp.id, new Set(restDays));
        }

        // ── 2. Generate all dates in range ────────────────────────────────────
        const allDates = eachDayOfInterval({
            start: parseISO(startDate),
            end: parseISO(endDate),
        }).map((d) => format(d, "yyyy-MM-dd"));

        // ── 3. Batch-fetch all existing records in the range ──────────────────
        // One query — not N×M
        const existingRecords = await db
            .select({
                id: attendance.id,
                employeeId: attendance.employeeId,
                date: attendance.date,
                status: attendance.status,
            })
            .from(attendance)
            .where(
                and(
                    inArray(attendance.employeeId, employeeIds),
                    gte(attendance.date, startDate),
                    lte(attendance.date, endDate),
                ),
            );

        // Index: "employeeId:date" → record id
        const existingIndex = new Map<string, string>();
        for (const rec of existingRecords) {
            existingIndex.set(`${rec.employeeId}:${rec.date}`, rec.id);
        }

        // ── 4. Build insert/update batches ────────────────────────────────────
        const toInsert: typeof attendance.$inferInsert[] = [];
        const toUpdate: { id: string; data: Partial<typeof attendance.$inferInsert> }[] = [];

        const summary = {
            created: 0,
            updated: 0,
            skippedRestDays: 0,
            skippedExisting: 0,
        };

        for (const emp of employeesList) {
            const restDays = empRestDays.get(emp.id)!;
            const standardHours = emp.standardDutyHours || 8;

            for (const dateStr of allDates) {
                const dayOfWeek = parseISO(dateStr).getDay(); // 0=Sun…6=Sat

                // Skip rest days — per employee config
                if (restDays.has(dayOfWeek)) {
                    summary.skippedRestDays++;
                    continue;
                }

                const key = `${emp.id}:${dateStr}`;
                const existingId = existingIndex.get(key);

                if (existingId && conflictStrategy === "skip") {
                    summary.skippedExisting++;
                    continue;
                }

                const { dutyHours, overtimeHours, overtimeStatus } = deriveDutyAndOvertime(
                    template.status,
                    standardHours,
                    template.checkIn,
                    template.checkOut,
                    template.checkIn2,
                    template.checkOut2,
                );

                const recordData = {
                    status: template.status,
                    checkIn: template.checkIn ?? null,
                    checkOut: template.checkOut ?? null,
                    checkIn2: template.checkIn2 ?? null,
                    checkOut2: template.checkOut2 ?? null,
                    dutyHours,
                    overtimeHours,
                    overtimeStatus,
                    leaveType:
                        template.status === "leave" ? (template.leaveType ?? null) : null,
                    leaveApprovalStatus:
                        template.status === "leave" ? "pending" : "none",
                    isApprovedLeave: false,
                    isLate: false,
                    isNightShift: false,
                    entrySource: template.entrySource,
                    notes: template.notes ?? null,
                    updatedAt: new Date(),
                };

                if (existingId) {
                    // overwrite strategy
                    toUpdate.push({ id: existingId, data: recordData });
                    summary.updated++;
                } else {
                    toInsert.push({
                        id: createId(),
                        employeeId: emp.id,
                        date: dateStr,
                        ...recordData,
                    });
                    summary.created++;
                }
            }
        }

        // ── 5. Execute in transaction ─────────────────────────────────────────
        await db.transaction(async (tx) => {
            // Batch inserts — one call per 500 rows to avoid param limits
            const BATCH = 500;
            for (let i = 0; i < toInsert.length; i += BATCH) {
                const chunk = toInsert.slice(i, i + BATCH);
                if (chunk.length > 0) await tx.insert(attendance).values(chunk);
            }

            // Updates — each needs its own WHERE clause; run in parallel
            await Promise.all(
                toUpdate.map(({ id, data }) =>
                    tx.update(attendance).set(data).where(eq(attendance.id, id)),
                ),
            );
        });

        return {
            success: true,
            summary,
            message: `Done — ${summary.created} created, ${summary.updated} updated, ${summary.skippedRestDays} rest days skipped, ${summary.skippedExisting} existing skipped.`,
        };
    });

// ── Preview (no writes) ────────────────────────────────────────────────────
// Call this before showing the confirmation to give the admin a summary
// of exactly what will happen without touching the DB.

export const previewBulkAttendanceFn = createServerFn()
    .middleware([requireHrManageMiddleware])
    .inputValidator(bulkAttendanceSchema)
    .handler(async ({ data }) => {
        const { startDate, endDate, conflictStrategy } = data;

        const employeesList =
            data.employeeIds.length > 0
                ? await db.query.employees.findMany({
                    where: inArray(employees.id, data.employeeIds),
                })
                : await db.query.employees.findMany({
                    where: eq(employees.status, "active"),
                });

        const employeeIds = employeesList.map((e) => e.id);

        const allDates = eachDayOfInterval({
            start: parseISO(startDate),
            end: parseISO(endDate),
        }).map((d) => format(d, "yyyy-MM-dd"));

        const existingRecords = await db
            .select({ employeeId: attendance.employeeId, date: attendance.date })
            .from(attendance)
            .where(
                and(
                    inArray(attendance.employeeId, employeeIds),
                    gte(attendance.date, startDate),
                    lte(attendance.date, endDate),
                ),
            );

        const existingIndex = new Set(
            existingRecords.map((r) => `${r.employeeId}:${r.date}`),
        );

        const summary = {
            totalDays: allDates.length,
            totalEmployees: employeesList.length,
            willCreate: 0,
            willUpdate: 0,
            skippedRestDays: 0,
            skippedExisting: 0,
        };

        for (const emp of employeesList) {
            const restDays: Set<number> = new Set(
                (emp.restDays as number[] | null) ?? [0],
            );

            for (const dateStr of allDates) {
                const dayOfWeek = parseISO(dateStr).getDay();
                if (restDays.has(dayOfWeek)) {
                    summary.skippedRestDays++;
                    continue;
                }
                const exists = existingIndex.has(`${emp.id}:${dateStr}`);
                if (exists && conflictStrategy === "skip") {
                    summary.skippedExisting++;
                    continue;
                }
                if (exists) summary.willUpdate++;
                else summary.willCreate++;
            }
        }

        return summary;
    });
