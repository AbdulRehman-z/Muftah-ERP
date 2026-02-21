import { useState, useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface ChartDataPoint {
    month: string;
    revenue: number;
    expenses: number;
    payroll: number;
}

interface RevenueExpenseChartProps {
    data: ChartDataPoint[];
}

type TimeRange = "all" | "6m" | "3m";

const ranges: { value: TimeRange; label: string }[] = [
    { value: "3m", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "all", label: "All" },
];

const formatPKR = (value: number) => {
    if (value >= 1_000_000) return `PKR ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `PKR ${(value / 1_000).toFixed(0)}K`;
    return `PKR ${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const revenue = payload.find((p: any) => p.dataKey === "revenue");
    const expenses = payload.find((p: any) => p.dataKey === "expenses");
    const profit = (revenue?.value ?? 0) - (expenses?.value ?? 0);
    const isProfitable = profit >= 0;

    return (
        <div
            style={{
                background: "rgba(10,10,14,0.92)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "14px 16px",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                minWidth: "fit-content",
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                {label}
            </p>
            {revenue && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 6 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Revenue</span>
                    <span style={{ color: "#e8f5e2", fontSize: 12, fontWeight: 700 }}>{formatPKR(revenue.value)}</span>
                </div>
            )}
            {expenses && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 10 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Expenses</span>
                    <span style={{ color: "#f5e2e2", fontSize: 12, fontWeight: 700 }}>{formatPKR(expenses.value)}</span>
                </div>
            )}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: 10 }} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Net</span>
                <span style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: isProfitable ? "#a3e635" : "#fb7185",
                }}>
                    {isProfitable ? "+" : ""}{formatPKR(profit)}
                </span>
            </div>
        </div>
    );
};

export function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("all");

    const filteredData = useMemo(() => {
        if (timeRange === "all" || data.length === 0) return data;
        const count = timeRange === "6m" ? 6 : 3;
        return data.slice(-count);
    }, [data, timeRange]);

    const totals = useMemo(() => {
        const totalRevenue = filteredData.reduce((s, d) => s + d.revenue, 0);
        const totalExpenses = filteredData.reduce((s, d) => s + d.expenses, 0);
        const net = totalRevenue - totalExpenses;
        const margin = totalRevenue > 0 ? ((net / totalRevenue) * 100).toFixed(1) : "0";
        return { totalRevenue, totalExpenses, net, margin };
    }, [filteredData]);

    return (
        <div style={{
            background: "linear-gradient(160deg, #0d0d12 0%, #111118 50%, #0c0c10 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.06)",
            // overflow: "hidden",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "24px 28px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                flexWrap: "wrap",
                gap: 16,
            }}>
                <div>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                        Financial Overview
                    </p>
                    <h2 style={{ color: "#f0f0f4", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                        Revenue vs Expenses
                    </h2>
                </div>

                {/* Segmented control */}
                <div style={{
                    display: "flex",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "10px",
                    padding: "3px",
                    gap: "2px",
                }}>
                    {ranges.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setTimeRange(r.value)}
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "6px 14px",
                                borderRadius: "7px",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                fontFamily: "'DM Sans', sans-serif",
                                letterSpacing: "0.02em",
                                background: timeRange === r.value
                                    ? "rgba(255,255,255,0.1)"
                                    : "transparent",
                                color: timeRange === r.value
                                    ? "#f0f0f4"
                                    : "rgba(255,255,255,0.35)",
                                boxShadow: timeRange === r.value
                                    ? "0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)"
                                    : "none",
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat pills */}
            <div style={{
                display: "flex",
                gap: 10,
                padding: "16px 28px",
                flexWrap: "wrap",
            }}>
                {[
                    { label: "Total Revenue", value: formatPKR(totals.totalRevenue), accent: "#a3e635", bg: "rgba(163,230,53,0.07)", dot: "#a3e635" },
                    { label: "Total Expenses", value: formatPKR(totals.totalExpenses), accent: "#fb7185", bg: "rgba(251,113,133,0.07)", dot: "#fb7185" },
                    { label: "Net Profit", value: `${totals.net >= 0 ? "+" : ""}${formatPKR(totals.net)}`, accent: totals.net >= 0 ? "#a3e635" : "#fb7185", bg: totals.net >= 0 ? "rgba(163,230,53,0.07)" : "rgba(251,113,133,0.07)", dot: totals.net >= 0 ? "#a3e635" : "#fb7185" },
                    { label: "Margin", value: `${totals.margin}%`, accent: "#818cf8", bg: "rgba(129,140,248,0.07)", dot: "#818cf8" },
                ].map((stat) => (
                    <div key={stat.label} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: stat.bg,
                        border: `1px solid ${stat.accent}22`,
                        borderRadius: "10px",
                        padding: "9px 14px",
                        flex: "1 1 auto",
                        minWidth: 130,
                    }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: stat.dot, flexShrink: 0 }} />
                        <div>
                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0, marginBottom: 2 }}>
                                {stat.label}
                            </p>
                            <p style={{ color: stat.accent, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                                {stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div style={{ padding: "4px 0 0" }}>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={filteredData} margin={{ top: 10, right: 28, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillRevenue2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a3e635" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="fillExpenses2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            vertical={false}
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray="0"
                        />

                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
                        />

                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={72}
                            tickFormatter={formatPKR}
                            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}
                        />

                        <Tooltip
                            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }}
                            content={<CustomTooltip />}
                        />

                        <Area
                            type="monotone"
                            dataKey="expenses"
                            stroke="#fb7185"
                            strokeWidth={1.5}
                            fill="url(#fillExpenses2)"
                            dot={false}
                            activeDot={{ r: 4, fill: "#fb7185", strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#a3e635"
                            strokeWidth={2}
                            fill="url(#fillRevenue2)"
                            dot={false}
                            activeDot={{ r: 4, fill: "#a3e635", strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{
                display: "flex",
                gap: 20,
                padding: "12px 28px 20px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                justifyContent: "flex-end",
            }}>
                {[
                    { color: "#a3e635", label: "Revenue" },
                    { color: "#fb7185", label: "Expenses" },
                ].map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{
                            width: 24,
                            height: 2,
                            borderRadius: 2,
                            background: item.color,
                        }} />
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}