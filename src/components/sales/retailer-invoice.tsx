import React from "react";

export type RetailerLineItem = {
    serialNo: number;
    productName: string;
    hsnCode: string;
    gstRate: string;
    rate: number;
    qty: number;
    grossAmount: number;
    netAmount: number;
};

export type RetailerInvoiceData = {
    customerName: string;
    address: string;
    phone: string;
    invoiceNo: string;
    date: string;
    saleType: string;
    items: RetailerLineItem[];
    cgst: number;
    sgst: number;
    amountInWords: string;
};

const COLORS = {
    headerYellow: "#FFC000",
    productGreen: "#92D050",
    qtyBlue: "#00B0F0",
    border: "#d1d5db"
};

export const RetailerInvoice = ({ data }: { data: RetailerInvoiceData }) => {
    const totalGross = data.items.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const grandTotal = totalGross + data.cgst + data.sgst;

    const fillerRows = Math.max(0, 10 - data.items.length); // Ensure standard height layout

    return (
        <div className="w-full max-w-[850px] mx-auto bg-white p-6 font-sans text-[12px] text-black">

            {/* Top Company Header Banner */}
            <div className="border-[2px] border-yellow-400 mb-4 flex items-center p-2 relative">
                <div className="bg-white p-1 rounded h-[60px] w-[60px] flex items-center justify-center mr-4 border">
                    <img src="/company-logo-transparent.png" alt="Muftah Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-3xl font-bold text-[#1f497d] tracking-wide m-0">MUFTAH CHEMICAL PVT LTD</h1>
                    <p className="font-semibold text-[13px] mt-1">Dagi Jadeed, Nowshera, KPK, Pakistan</p>
                    <p className="font-semibold text-[13px]">Phone: +92 300 9040816, Email: swash.detergents@gmail.com</p>
                </div>
                <div className="w-[60px] h-[60px] flex items-center justify-center opacity-70">
                    {/* Placeholder for right side logo/icon if needed, using purely generic shapes for layout balancing */}
                    <div className="rounded-full bg-[#1f497d] h-10 w-10 relative overflow-hidden">
                        <div className="absolute bg-white h-6 w-6 rounded-full top-2 left-2 flex items-center justify-center">
                            <div className="bg-[#1f497d] h-2 w-2 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Details Block */}
            <div className="mb-8">
                <div className="font-bold p-1 pl-2 w-[180px] border border-black mb-2" style={{ backgroundColor: COLORS.headerYellow }}>
                    Customer Detail
                </div>

                <div className="flex justify-between">
                    {/* Left block */}
                    <div className="w-[50%] flex flex-col gap-1.5">
                        <div className="flex items-center">
                            <span className="font-bold w-[150px] text-[11px]">CUSTOMER NAME</span>
                            <div className="flex-1 border border-black h-6 px-2 flex items-center">{data.customerName}</div>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold w-[150px] text-[11px]">COMPLETE ADDRESS</span>
                            <div className="flex-1 border border-black h-6 px-2 flex items-center">{data.address}</div>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold w-[150px] text-[11px]">PHONE NUMBER</span>
                            <div className="flex-1 border border-black h-6 px-2 flex items-center">{data.phone}</div>
                        </div>
                    </div>

                    {/* Right block */}
                    <div className="w-[30%] flex flex-col gap-1.5">
                        <div className="flex items-center">
                            <span className="font-bold w-[120px] text-[11px]">INVOICE NO</span>
                            <div className="flex-1 border border-black h-6 px-2 flex items-center text-center">{data.invoiceNo}</div>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold w-[120px] text-[11px]">DATE</span>
                            <div className="flex-1 border border-black h-6 px-2 flex items-center text-center">{data.date}</div>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold w-[120px] text-[11px]">SELECT SALE TYPE</span>
                            <div className="flex-1 border border-black h-6 px-2 flex items-center text-center">{data.saleType}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse mb-6 border border-black text-center">
                <thead>
                    <tr style={{ backgroundColor: COLORS.headerYellow }} className="border-b border-black text-[11px]">
                        <th className="border border-black py-1 w-[6%]">S. NO</th>
                        <th className="border border-black py-1 w-[30%]">Product Name</th>
                        <th className="border border-black py-1 w-[12%]">HSN Code</th>
                        <th className="border border-black py-1 w-[10%]">GST Rate</th>
                        <th className="border border-black py-1 w-[10%]">Rate</th>
                        <th className="border border-black py-1 w-[8%]">Qty</th>
                        <th className="border border-black py-1 w-[12%]">Gross Amount</th>
                        <th className="border border-black py-1 w-[12%]">Net Ammount</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-300">
                            <td className="border border-black py-1.5" style={{ backgroundColor: COLORS.headerYellow }}>{item.serialNo}</td>
                            <td className="border border-black py-1.5 text-left pl-2" style={{ backgroundColor: COLORS.productGreen }}>{item.productName}</td>
                            <td className="border border-black py-1.5">{item.hsnCode}</td>
                            <td className="border border-black py-1.5">{item.gstRate}</td>
                            <td className="border border-black py-1.5">{item.rate}</td>
                            <td className="border border-black py-1.5" style={{ backgroundColor: COLORS.qtyBlue }}>{item.qty}</td>
                            <td className="border border-black py-1.5 text-right pr-2">{item.grossAmount}</td>
                            <td className="border border-black py-1.5 text-right pr-2">{item.netAmount}</td>
                        </tr>
                    ))}
                    {/* Render empty rows to maintain layout block style */}
                    {[...Array(fillerRows)].map((_, i) => (
                        <tr key={`filler-${i}`} className="h-6">
                            <td className="border border-black" style={{ backgroundColor: COLORS.headerYellow }}></td>
                            <td className="border border-black" style={{ backgroundColor: COLORS.productGreen }}></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black" style={{ backgroundColor: COLORS.qtyBlue }}></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Bottom Summary Section */}
            <div className="flex justify-end mb-6">
                <table className="w-[30%] border-collapse text-right border border-black">
                    <tbody>
                        <tr style={{ backgroundColor: COLORS.headerYellow }} className="text-center font-bold">
                            <td className="border border-black py-1 w-[60%]">SUMMARY</td>
                            <td className="border border-black py-1 w-[40%]">AMOUNT</td>
                        </tr>
                        <tr>
                            <td className="border border-black py-1 pr-2 font-bold">Gross Amount</td>
                            <td className="border border-black py-1 pr-2">{totalGross}</td>
                        </tr>
                        <tr><td className="border border-black py-1" colSpan={2}>&nbsp;</td></tr>
                        <tr>
                            <td className="border border-black py-1 pr-2 font-bold text-[11px]">CGST</td>
                            <td className="border border-black py-1 pr-2">{data.cgst}</td>
                        </tr>
                        <tr>
                            <td className="border border-black py-1 pr-2 font-bold text-[11px]">SGST</td>
                            <td className="border border-black py-1 pr-2">{data.sgst}</td>
                        </tr>
                        <tr>
                            <td className="border border-black py-1 pr-2 font-bold">Grand Total</td>
                            <td className="border border-black py-1 pr-2 font-bold">{grandTotal}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Amount In Words Line */}
            <div className="flex border border-black mb-16">
                <div className="font-bold px-4 py-1 text-[11px] min-w-[150px] border-r border-black" style={{ backgroundColor: COLORS.headerYellow }}>
                    Amount In Words
                </div>
                <div className="px-4 py-1 flex-1 font-bold">
                    {data.amountInWords || "0"}
                </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between px-10 mb-8 mt-10">
                <div className="w-[200px] text-center">
                    <div className="font-bold text-[13px] mb-2">Customer Signature</div>
                    <div className="border-t border-black w-full"></div>
                </div>
                <div className="w-[200px] text-center">
                    <div className="font-bold text-[13px] mb-2">Account Signature</div>
                    <div className="border-t border-black w-full"></div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center font-bold text-[15px] p-2 border border-black" style={{ backgroundColor: COLORS.headerYellow }}>
                Thank you for being a part of our journey.
            </div>
        </div>
    );
};