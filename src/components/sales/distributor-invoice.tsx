export type DistributorLineItem = {
    serialNo: number;
    itemCode: string;
    description: string;
    cartonQty: number;
    schemeCarton: number;
    cartonRate: number;
    grossAmount: number;
    discount: number;
    netAmount: number;
};

export type DistributorInvoiceData = {
    partyName: string;
    address: string;
    city: string;
    tel: string;
    mob: string;
    date: string;
    estNo: string;
    docNo: string;
    pvNo: string;
    mBillNo: string;
    transporter: string;
    biltyNo: string;
    items: DistributorLineItem[];
    comments: string;
    freight: number;
    previousBalance: number;
};

export const DistributorInvoice = ({ data }: { data: DistributorInvoiceData }) => {
    const totalOrderCartons = data.items.reduce((acc, curr) => acc + curr.cartonQty, 0);
    const totalSchemeCartons = data.items.reduce((acc, curr) => acc + curr.schemeCarton, 0);
    const totalGross = data.items.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const totalDisc = data.items.reduce((acc, curr) => acc + curr.discount, 0);
    const totalNet = data.items.reduce((acc, curr) => acc + curr.netAmount, 0);
    const grandTotal = totalNet + data.previousBalance + data.freight;

    const fmtNum = (num: number, isCurrency = true) =>
        num.toLocaleString("en-US", { minimumFractionDigits: isCurrency ? 2 : 0, maximumFractionDigits: isCurrency ? 2 : 0 });

    return (
        <div className="w-full max-w-[900px] mx-auto bg-white p-8 text-black font-sans text-[11px] leading-relaxed">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="font-bold text-xl tracking-wider">IIPL</div>
                <div className="font-bold text-base underline underline-offset-4">Sales Estimate</div>
            </div>

            {/* Info Boxes */}
            <div className="flex gap-4 mb-4">
                {/* Party Details Box */}
                <div className="flex-1 border-[1.5px] border-black rounded-[10px] p-3">
                    <div className="flex gap-2 mb-2">
                        <span className="font-bold min-w-[80px]">Party Name :</span>
                        <span>{data.partyName}</span>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <span className="font-bold min-w-[80px]">Address :</span>
                        <span>{data.address}</span>
                    </div>
                    <div className="flex gap-2 mb-1">
                        <span className="font-bold min-w-[80px]">City :</span>
                        <span>{data.city}</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                            <span className="font-bold min-w-[80px]">Tel :</span>
                            <span>{data.tel}</span>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <span className="font-bold">Mob :</span>
                            <span>{data.mob}</span>
                        </div>
                    </div>
                </div>

                {/* Doc Details Box */}
                <div className="w-[300px] border-[1.5px] border-black rounded-[10px] p-3">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold">Date :</span>
                        <span>{data.date}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <div className="flex gap-2"><span className="font-bold">Est. # :</span><span>{data.estNo}</span></div>
                        <div className="flex gap-2"><span className="font-bold">Doc No :</span><span>{data.docNo}</span></div>
                    </div>
                    <div className="flex justify-between mb-2">
                        <div className="flex gap-2"><span className="font-bold">P.V No :</span><span>{data.pvNo}</span></div>
                        <div className="flex gap-2"><span className="font-bold">M.Bill No :</span><span>{data.mBillNo}</span></div>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="font-bold">Transporter :</span>
                        <span>{data.transporter}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Bilty No :</span>
                        <span>{data.biltyNo}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse mb-2 border-[1.5px] border-black">
                <thead className="bg-gray-100">
                    <tr className="border-b-[1.5px] border-black text-center">
                        <th className="border-r border-black font-normal py-1.5 w-[5%]">Serial<br />No.</th>
                        <th className="border-r border-black font-normal py-1.5 w-[8%]">Item<br />Code</th>
                        <th className="border-r border-black font-normal py-1.5 w-[30%]">Item<br />Description</th>
                        <th className="border-r border-black font-normal py-1.5 w-[8%]">Carton<br />Qty</th>
                        <th className="border-r border-black font-normal py-1.5 w-[8%]">Scheme<br />Carton</th>
                        <th className="border-r border-black font-normal py-1.5 w-[9%]">Carton<br />Rate</th>
                        <th className="border-r border-black font-normal py-1.5 w-[11%]">Gross<br />Amout</th>
                        <th className="border-r border-black font-normal py-1.5 w-[9%]">Disc.</th>
                        <th className="font-normal py-1.5 w-[12%]">Net<br />Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, i) => (
                        <tr key={i} className="text-center align-top">
                            <td className="border-r border-black py-1.5">{item.serialNo}</td>
                            <td className="border-r border-black py-1.5">{item.itemCode}</td>
                            <td className="border-r border-black py-1.5 text-left pl-2">{item.description}</td>
                            <td className="border-r border-black py-1.5">{item.cartonQty} - 0</td>
                            <td className="border-r border-black py-1.5">{item.schemeCarton} - 0</td>
                            <td className="border-r border-black py-1.5">{fmtNum(item.cartonRate, false)}</td>
                            <td className="border-r border-black py-1.5 text-right pr-2">{fmtNum(item.grossAmount, false)}</td>
                            <td className="border-r border-black py-1.5 text-right pr-2">{fmtNum(item.discount, false)}</td>
                            <td className="py-1.5 text-right pr-2">{fmtNum(item.netAmount)}</td>
                        </tr>
                    ))}
                    {/* Table Summary Row */}
                    <tr className="border-t-[1.5px] border-b-[1.5px] border-black text-center font-bold">
                        <td colSpan={3} className="border-r border-black py-2 text-right pr-4"></td>
                        <td className="border-r border-black py-2">{totalOrderCartons} - 0</td>
                        <td className="border-r border-black py-2">{totalSchemeCartons} - 0</td>
                        <td className="border-r border-black py-2"></td>
                        <td className="border-r border-black py-2 text-right pr-2">{fmtNum(totalGross, false)}</td>
                        <td className="border-r border-black py-2 text-right pr-2">{fmtNum(totalDisc, false)}</td>
                        <td className="py-2 text-right pr-2">{fmtNum(totalNet)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer Calculation Section */}
            <div className="flex justify-between items-start mt-4 pt-2">
                {/* Left Side */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex gap-2">
                        <span className="font-bold">No. of Lines :</span>
                        <span>{data.items.length}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <span className="font-bold">Comments :</span>
                        <span>{data.comments}</span>
                    </div>
                </div>

                {/* Center Cartons summary */}
                <div className="flex flex-col gap-1.5 min-w-[220px]">
                    <div className="flex justify-between">
                        <span className="font-bold">Total Order Cartons :</span>
                        <span className="font-bold">{totalOrderCartons} - 0</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Total Scheme Cartons :</span>
                        <span className="font-bold">{totalSchemeCartons} - 0</span>
                    </div>
                    <div className="flex justify-between border-t border-black pt-1 mt-1">
                        <span className="font-bold">Net Cartons :</span>
                        <span className="font-bold">{totalOrderCartons + totalSchemeCartons} - 0</span>
                    </div>
                </div>

                {/* Right amounts summary */}
                <div className="flex flex-col gap-1.5 min-w-[250px]">
                    <div className="flex justify-between">
                        <span className="font-bold">Frieght :</span>
                        <span className="text-right w-[100px]">{fmtNum(data.freight)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Invoice Amount :</span>
                        <span className="font-bold text-right w-[100px]">{fmtNum(totalNet)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Previous Balance :</span>
                        <span className="font-bold text-right w-[100px]">{fmtNum(data.previousBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Grand Total :</span>
                        <span className="font-bold text-right w-[100px]">{fmtNum(grandTotal)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};