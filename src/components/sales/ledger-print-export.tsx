import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";

interface LedgerEntry {
  type: "invoice" | "payment";
  date: Date | string;
  [key: string]: any;
}

interface PrintExportToolbarProps {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  entries: LedgerEntry[];
  summary: {
    totalSales?: number;
    totalCash?: number;
    totalCredit?: number;
    totalPayments?: number;
    closingBalance?: number;
    invoiceCount?: number;
    [key: string]: any;
  };
  columns: { key: string; label: string; format?: (val: any, entry: any) => string }[];
}

export function PrintExportToolbar({ title, subtitle, periodLabel, entries, summary, columns }: PrintExportToolbarProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowHtml = entries
      .map((entry) => {
        const cells = columns
          .map((col) => {
            const raw = entry[col.key];
            const formatted = col.format ? col.format(raw, entry) : String(raw ?? "—");
            return `<td style="border:1px solid #ccc;padding:8px;font-size:12px;text-align:${col.key.includes("amount") || col.key.includes("balance") || col.key.includes("debit") || col.key.includes("credit") ? "right" : "left"}">${formatted}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const summaryHtml = Object.entries(summary)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
        return `<div style="font-size:12px;color:#666;">${label}: <strong>${formatPKR(v as number)}</strong></div>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
            th { background: #f5f5f5; text-align: left; }
            .header { margin-bottom: 16px; }
            .header h2 { margin: 0; font-size: 18px; }
            .meta { color: #666; font-size: 12px; margin-top: 4px; }
            .summary { margin-top: 16px; padding-top: 12px; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${title}</h2>
            ${subtitle ? `<div class="meta">${subtitle}</div>` : ""}
            ${periodLabel ? `<div class="meta">Period: ${periodLabel}</div>` : ""}
          </div>
          <table>
            <thead>
              <tr>
                ${columns.map((c) => `<th>${c.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rowHtml || `<tr><td colspan="${columns.length}" style="text-align:center;color:#999;">No entries</td></tr>`}
            </tbody>
          </table>
          <div class="summary">
            ${summaryHtml}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  const handleCSV = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = entries.map((entry) =>
      columns
        .map((col) => {
          const raw = entry[col.key];
          const formatted = col.format ? col.format(raw, entry) : String(raw ?? "");
          return `"${formatted.replace(/"/g, '""')}"`;
        })
        .join(","),
    );

    const summaryRow = `\n\n"Summary"${",".repeat(columns.length - 1)}`;
    const summaryRows = Object.entries(summary)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
        return `"${label}","${formatPKR(v as number)}"${",".repeat(columns.length - 2)}`;
      })
      .join("\n");

    const csv = [header, ...rows, summaryRow, summaryRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = title.replace(/\s+/g, "_").toLowerCase();
    link.download = `${safeTitle}_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handlePrint}>
        <Printer className="size-4 mr-1.5" />
        Print
      </Button>
      <Button size="sm" variant="outline" onClick={handleCSV}>
        <Download className="size-4 mr-1.5" />
        Soft Copy
      </Button>
    </div>
  );
}

function formatPKR(v: number): string {
  return `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
}
