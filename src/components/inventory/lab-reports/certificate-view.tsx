import { useRef } from "react";
import { format } from "date-fns";
import { Button } from "../../ui/button";
import { Printer } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../ui/dialog";

type AnalysisItem = {
    item: string;
    requirement: string;
    result: string;
    passed: boolean;
};

type LabReport = {
    id: string;
    productName: string;
    stockNumber: string | null;
    lotNumber: string | null;
    analysisItems: AnalysisItem[];
    certifiedBy: string;
    certifierTitle: string | null;
    reportDate: string | Date;
    standardReference: string | null;
    notes: string | null;
    chemical: {
        id: string;
        name: string;
        unit: string;
    };
    createdBy: {
        id: string;
        name: string;
    };
};

type CertificateViewProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    report: LabReport;
    companyName?: string;
    companyTagline?: string;
};

export const CertificateView = ({
    open,
    onOpenChange,
    report,
    companyName = "Titan Enterprise",
    companyTagline = "Manufacturers of Cleaners & Disinfectants",
}: CertificateViewProps) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>COA - ${report.productName} - ${report.lotNumber || "N/A"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #1a1a1a;
              background: white;
              padding: 0;
            }

            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              @page { margin: 15mm; size: A4; }
            }

            .certificate {
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 16px;
              margin-bottom: 8px;
            }

            .company-name {
              font-size: 28px;
              font-weight: 900;
              color: #1e3a5f;
              letter-spacing: -0.5px;
            }

            .company-tagline {
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-top: 2px;
            }

            .report-id {
              font-size: 10px;
              color: #94a3b8;
              font-weight: 700;
              text-align: right;
              font-family: monospace;
            }

            .title-section {
              text-align: center;
              margin: 24px 0;
            }

            .title {
              font-size: 22px;
              font-weight: 800;
              color: #1e40af;
              letter-spacing: 3px;
              text-transform: uppercase;
            }

            .standard-ref {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
              font-style: italic;
            }

            .intro-text {
              font-size: 11px;
              color: #475569;
              line-height: 1.6;
              background: #f8fafc;
              padding: 12px 16px;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              margin-bottom: 20px;
            }

            .product-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              overflow: hidden;
              margin-bottom: 24px;
            }

            .product-info-item {
              display: flex;
              padding: 8px 14px;
              border-bottom: 1px solid #e2e8f0;
            }

            .product-info-item:nth-child(odd) {
              border-right: 1px solid #e2e8f0;
            }

            .product-info-label {
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              min-width: 120px;
            }

            .product-info-value {
              font-size: 12px;
              font-weight: 700;
              color: #1e293b;
            }

            .analysis-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              overflow: hidden;
            }

            .analysis-table th {
              background: #1e40af;
              color: white;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 10px 14px;
              text-align: left;
            }

            .analysis-table th:nth-child(3),
            .analysis-table th:nth-child(4) {
              text-align: center;
            }

            .analysis-table td {
              padding: 9px 14px;
              font-size: 12px;
              border-bottom: 1px solid #e2e8f0;
            }

            .analysis-table tr:nth-child(even) {
              background: #f8fafc;
            }

            .analysis-table tr:last-child td {
              border-bottom: none;
            }

            .analysis-table td:nth-child(1) {
              font-weight: 600;
            }

            .analysis-table td:nth-child(3),
            .analysis-table td:nth-child(4) {
              text-align: center;
            }

            .pass-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .pass-badge.pass {
              background: #dcfce7;
              color: #166534;
              border: 1px solid #bbf7d0;
            }

            .pass-badge.fail {
              background: #fee2e2;
              color: #991b1b;
              border: 1px solid #fecaca;
            }

            .notes-section {
              font-size: 11px;
              color: #475569;
              font-style: italic;
              background: #fffbeb;
              padding: 10px 14px;
              border: 1px solid #fef3c7;
              border-radius: 4px;
              margin-bottom: 24px;
              line-height: 1.5;
            }

            .disclaimer {
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              margin-bottom: 28px;
              font-style: italic;
            }

            .signature-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 32px;
              padding-top: 20px;
            }

            .signature-block {
              text-align: center;
            }

            .signature-line {
              width: 200px;
              border-top: 2px solid #1e293b;
              margin-bottom: 6px;
              margin-top: 48px;
            }

            .signature-name {
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
            }

            .signature-title {
              font-size: 11px;
              color: #64748b;
            }

            .signature-date {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 2px;
            }

            .footer {
              margin-top: 40px;
              padding-top: 16px;
              border-top: 2px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              color: #94a3b8;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    const allPassed = report.analysisItems.every((i) => i.passed);
    const reportDateFormatted = format(
        new Date(report.reportDate),
        "MMMM d, yyyy",
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] !max-w-[1200px] max-h-[90vh] overflow-auto p-0">
                <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-md p-4 border-b flex flex-row items-center justify-between">
                    <DialogTitle className="text-sm font-bold">
                        Certificate of Analysis — {report.productName}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold"
                            onClick={handlePrint}
                        >
                            <Printer className="size-3 mr-1.5" />
                            Print / Save PDF
                        </Button>
                    </div>
                </DialogHeader>

                {/* Certificate Content */}
                <div ref={printRef} className="p-6 overflow-x-hidden">
                    <div className="certificate" style={{ maxWidth: "100%" }}>
                        {/* Header */}
                        <div className="header" style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "3px solid #1e40af",
                            paddingBottom: "16px",
                            marginBottom: "8px",
                        }}>
                            <div>
                                <div className="company-name" style={{
                                    fontSize: "28px",
                                    fontWeight: 900,
                                    color: "#1e3a5f",
                                    letterSpacing: "-0.5px",
                                }}>
                                    {companyName}
                                </div>
                                <div className="company-tagline" style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    fontWeight: 600,
                                    textTransform: "uppercase" as const,
                                    letterSpacing: "1.5px",
                                    marginTop: "2px",
                                }}>
                                    {companyTagline}
                                </div>
                            </div>
                            <div className="report-id" style={{
                                fontSize: "10px",
                                color: "#94a3b8",
                                fontWeight: 700,
                                textAlign: "right" as const,
                                fontFamily: "monospace",
                            }}>
                                Report: {report.id.substring(0, 10).toUpperCase()}
                            </div>
                        </div>

                        {/* Title */}
                        <div className="title-section" style={{
                            textAlign: "center" as const,
                            margin: "24px 0",
                        }}>
                            <div className="title" style={{
                                fontSize: "22px",
                                fontWeight: 800,
                                color: "#1e40af",
                                letterSpacing: "3px",
                                textTransform: "uppercase" as const,
                            }}>
                                Certificate of Analysis
                            </div>
                            {report.standardReference && (
                                <div className="standard-ref" style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    marginTop: "4px",
                                    fontStyle: "italic",
                                }}>
                                    Manufactured under a quality system registered to{" "}
                                    {report.standardReference} Standards
                                </div>
                            )}
                        </div>

                        {/* Intro Text */}
                        <div className="intro-text" style={{
                            fontSize: "11px",
                            color: "#475569",
                            lineHeight: 1.6,
                            background: "#f8fafc",
                            padding: "12px 16px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            marginBottom: "20px",
                        }}>
                            This document certifies that the listed products are produced
                            according to, and meet the requirement of current production and
                            Quality Standards, following all GMP procedures.
                        </div>

                        {/* Product Info Grid */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            overflow: "hidden",
                            marginBottom: "24px",
                        }}>
                            <div style={{
                                display: "flex",
                                padding: "8px 14px",
                                borderBottom: "1px solid #e2e8f0",
                                borderRight: "1px solid #e2e8f0",
                            }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, minWidth: "120px" }}>
                                    Product:
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                                    {report.productName}
                                </span>
                            </div>
                            <div style={{
                                display: "flex",
                                padding: "8px 14px",
                                borderBottom: "1px solid #e2e8f0",
                            }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, minWidth: "120px" }}>
                                    Chemical:
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                                    {report.chemical.name}
                                </span>
                            </div>
                            <div style={{
                                display: "flex",
                                padding: "8px 14px",
                                borderBottom: "1px solid #e2e8f0",
                                borderRight: "1px solid #e2e8f0",
                            }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, minWidth: "120px" }}>
                                    Stock No.:
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                                    {report.stockNumber || "—"}
                                </span>
                            </div>
                            <div style={{
                                display: "flex",
                                padding: "8px 14px",
                                borderBottom: "1px solid #e2e8f0",
                            }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, minWidth: "120px" }}>
                                    Lot Number:
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                                    {report.lotNumber || "—"}
                                </span>
                            </div>
                            <div style={{
                                display: "flex",
                                padding: "8px 14px",
                                borderRight: "1px solid #e2e8f0",
                            }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, minWidth: "120px" }}>
                                    Report Date:
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                                    {reportDateFormatted}
                                </span>
                            </div>
                            <div style={{
                                display: "flex",
                                padding: "8px 14px",
                            }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, minWidth: "120px" }}>
                                    Overall Status:
                                </span>
                                <span style={{
                                    fontSize: "12px",
                                    fontWeight: 800,
                                    color: allPassed ? "#166534" : "#991b1b",
                                }}>
                                    {allPassed ? "✅ ALL PARAMETERS PASSED" : "⚠️ SOME PARAMETERS FAILED"}
                                </span>
                            </div>
                        </div>

                        {/* Analysis Table */}
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            marginBottom: "24px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            overflow: "hidden",
                        }}>
                            <thead>
                                <tr>
                                    <th style={{
                                        background: "#1e40af",
                                        color: "white",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        textTransform: "uppercase" as const,
                                        letterSpacing: "1px",
                                        padding: "10px 14px",
                                        textAlign: "left" as const,
                                        width: "30px",
                                    }}>
                                        #
                                    </th>
                                    <th style={{
                                        background: "#1e40af",
                                        color: "white",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        textTransform: "uppercase" as const,
                                        letterSpacing: "1px",
                                        padding: "10px 14px",
                                        textAlign: "left" as const,
                                    }}>
                                        Analysis Item
                                    </th>
                                    <th style={{
                                        background: "#1e40af",
                                        color: "white",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        textTransform: "uppercase" as const,
                                        letterSpacing: "1px",
                                        padding: "10px 14px",
                                        textAlign: "center" as const,
                                    }}>
                                        Requirement
                                    </th>
                                    <th style={{
                                        background: "#1e40af",
                                        color: "white",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        textTransform: "uppercase" as const,
                                        letterSpacing: "1px",
                                        padding: "10px 14px",
                                        textAlign: "center" as const,
                                    }}>
                                        Results
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.analysisItems.map((item, idx) => (
                                    <tr key={idx} style={{
                                        background: idx % 2 === 1 ? "#f8fafc" : "white",
                                    }}>
                                        <td style={{
                                            padding: "9px 14px",
                                            fontSize: "12px",
                                            borderBottom: idx < report.analysisItems.length - 1 ? "1px solid #e2e8f0" : "none",
                                            color: "#64748b",
                                            fontWeight: 500,
                                        }}>
                                            {idx + 1}.
                                        </td>
                                        <td style={{
                                            padding: "9px 14px",
                                            fontSize: "12px",
                                            borderBottom: idx < report.analysisItems.length - 1 ? "1px solid #e2e8f0" : "none",
                                            fontWeight: 600,
                                        }}>
                                            {item.item}
                                        </td>
                                        <td style={{
                                            padding: "9px 14px",
                                            fontSize: "12px",
                                            borderBottom: idx < report.analysisItems.length - 1 ? "1px solid #e2e8f0" : "none",
                                            textAlign: "center" as const,
                                        }}>
                                            {item.requirement}
                                        </td>
                                        <td style={{
                                            padding: "9px 14px",
                                            fontSize: "12px",
                                            borderBottom: idx < report.analysisItems.length - 1 ? "1px solid #e2e8f0" : "none",
                                            textAlign: "center" as const,
                                            fontWeight: 700,
                                            color: item.passed ? "#166534" : "#991b1b",
                                        }}>
                                            {item.result}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Notes */}
                        {report.notes && (
                            <div style={{
                                fontSize: "11px",
                                color: "#475569",
                                fontStyle: "italic",
                                background: "#fffbeb",
                                padding: "10px 14px",
                                border: "1px solid #fef3c7",
                                borderRadius: "4px",
                                marginBottom: "24px",
                                lineHeight: 1.5,
                            }}>
                                <strong>Notes:</strong> {report.notes}
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div style={{
                            fontSize: "10px",
                            color: "#94a3b8",
                            textAlign: "center" as const,
                            marginBottom: "28px",
                            fontStyle: "italic",
                        }}>
                            The above certification does not change our normal published terms
                            and conditions for sale.
                        </div>

                        {/* Signature */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            marginTop: "32px",
                            paddingTop: "20px",
                        }}>
                            <div style={{ textAlign: "center" as const }}>
                                <div style={{
                                    width: "200px",
                                    borderTop: "2px solid #1e293b",
                                    marginBottom: "6px",
                                    marginTop: "48px",
                                }} />
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                                    {report.certifiedBy}
                                </div>
                                {report.certifierTitle && (
                                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                                        {report.certifierTitle}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: "center" as const }}>
                                <div style={{
                                    width: "200px",
                                    borderTop: "2px solid #1e293b",
                                    marginBottom: "6px",
                                    marginTop: "48px",
                                }} />
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                                    Date
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    {reportDateFormatted}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            marginTop: "40px",
                            paddingTop: "16px",
                            borderTop: "2px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            color: "#94a3b8",
                            fontSize: "9px",
                            fontWeight: 600,
                            textTransform: "uppercase" as const,
                            letterSpacing: "1px",
                        }}>
                            <span>Certificate ID: {report.id.substring(0, 12).toUpperCase()}</span>
                            <span>{companyName} Quality Assurance Department</span>
                            <span>Generated: {format(new Date(), "MMM d, yyyy")}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
