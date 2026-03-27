import { db } from "@/db";
import { expenseCategories } from "@/db/schemas/finance-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

// ── List Categories ────────────────────────────────────────────────────────
export const listExpenseCategoriesFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return db.query.expenseCategories.findMany({
      where: eq(expenseCategories.isActive, true),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  });

// ── List All (including inactive) for admin management ────────────────────
export const listAllExpenseCategoriesFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return db.query.expenseCategories.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  });

// ── Create Category ────────────────────────────────────────────────────────
export const createExpenseCategoryFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      name: z.string().min(1).max(50),
      icon: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const [category] = await db
      .insert(expenseCategories)
      .values({
        id: createId(),
        name: data.name,
        icon: data.icon ?? null,
        isActive: true,
      })
      .returning();
    return category;
  });

// ── Update Category ────────────────────────────────────────────────────────
export const updateExpenseCategoryFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      icon: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { id, ...updates } = data;
    const [category] = await db
      .update(expenseCategories)
      .set(updates)
      .where(eq(expenseCategories.id, id))
      .returning();
    return category;
  });

// ── Delete (soft-delete) Category ─────────────────────────────────────────
export const deleteExpenseCategoryFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, data.id));
    return { success: true };
  });
