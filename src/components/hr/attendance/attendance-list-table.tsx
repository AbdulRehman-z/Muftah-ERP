import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/custom/data-table";
import { Button } from "@/components/ui/button";
import { Edit2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { EditAttendanceSheet } from "./edit-attendance-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Users } from "lucide-react";

interface AttendanceRecord {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  checkIn2: string | null;
  checkOut2: string | null;
  status: "present" | "absent" | "leave" | "holiday";
  dutyHours: string | null;
  overtimeHours: string | null;
  isLate: boolean | null;
  isNightShift: boolean | null;
  isApprovedLeave: boolean | null;
  overtimeStatus: "pending" | "approved" | "rejected" | null;
  overtimeRemarks: string | null;
  entrySource: "biometric" | "manual" | null;
  notes: string | null;
  areaVisited?: string | null;
  paymentMode?: "per_km" | null;
  distanceKm?: string | null;
  perKmRate?: string | null;
  saleAmount?: string | null;
  recoveryAmount?: string | null;
  returnAmount?: string | null;
  slipNumbers?: string | null;
  shopType?: "old" | "new" | null;
}

interface EmployeeWithAttendance {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  isOrderBooker: boolean;
  standardDutyHours: number | null;
  attendance: AttendanceRecord[];
}

interface Props {
  data: EmployeeWithAttendance[];
  date: string;
}



export const AttendanceListTable = ({ data, date }: Props) => {
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithAttendance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEdit = (employee: EmployeeWithAttendance) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const standardColumns: ColumnDef<EmployeeWithAttendance>[] = [
    {
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col min-w-[120px]">
          <span className="font-bold text-xs uppercase">{`${row.original.firstName} ${row.original.lastName}`}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{row.original.designation}</span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (!record) return <span className="text-muted-foreground text-[10px] uppercase">N/A</span>;
        return <span className={`text-[10px] font-bold uppercase ${record.status === 'present' ? 'text-emerald-600' : 'text-rose-600'}`}>{record.status.replace("_", " ")}</span>;
      },
    },
    {
      header: "Check-In",
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.attendance[0]?.checkIn || "-"}</span>,
    },
    {
      header: "Check-Out",
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.attendance[0]?.checkOut || "-"}</span>,
    },
    {
      header: "Duty (Hrs)",
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.attendance[0]?.dutyHours || "-"}</span>,
    },
    {
      header: "O/T (Hrs)",
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.attendance[0]?.overtimeHours || "-"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none text-muted-foreground hover:bg-muted"
            onClick={() => handleEdit(row.original)}
            title="Edit Attendance"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none text-muted-foreground hover:bg-muted"
            asChild
            title="View Details"
          >
            <Link to="/hr/attendance/$employeeId" params={{ employeeId: row.original.id }}>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const orderBookerColumns: ColumnDef<EmployeeWithAttendance>[] = [
    {
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col min-w-[120px]">
          <span className="font-bold text-xs uppercase">{`${row.original.firstName} ${row.original.lastName}`}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{row.original.designation}</span>
        </div>
      ),
      footer: () => <div className="text-right">TOTALS</div>,
    },
    {
      header: "Status",
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (!record) return <span className="text-muted-foreground text-[10px] uppercase">N/A</span>;
        return <span className={`text-[10px] font-bold uppercase ${record.status === 'present' ? 'text-emerald-600' : 'text-rose-600'}`}>{record.status}</span>;
      },
    },
    {
      header: "Area",
      cell: ({ row }) => <span className="text-xs">{row.original.attendance[0]?.areaVisited || "-"}</span>,
    },
    {
      header: "Mode",
      cell: ({ row }) => {
        const mode = row.original.attendance[0]?.paymentMode;
        if (!mode) return "-";
        return <span className="text-[10px] uppercase whitespace-nowrap">Per KM</span>;
      },
    },
    {
      header: "Dist. (KM)",
      accessorFn: (row) => row.attendance[0]?.distanceKm || "0",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.attendance[0]?.distanceKm || "-"}</span>,
    },
    {
      header: "Rate",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.attendance[0]?.perKmRate || "-"}</span>,
    },
    {
      header: "Dyn. TA",
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (!record || record.paymentMode !== "per_km") return "-";
        const ta = parseFloat(record.distanceKm || "0") * parseFloat(record.perKmRate || "0");
        return <span className="font-mono text-xs font-bold">{ta > 0 ? ta.toLocaleString() : "-"}</span>;
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
          const rec = row.original.attendance[0];
          if (rec?.paymentMode === "per_km") {
            return sum + (parseFloat(rec.distanceKm || "0") * parseFloat(rec.perKmRate || "0"));
          }
          return sum;
        }, 0);
        return <span className="font-mono text-xs text-emerald-600">{total > 0 ? total.toLocaleString() : "0"}</span>;
      }
    },
    {
      header: "Sale",
      accessorFn: (row) => row.attendance[0]?.saleAmount || "0",
      cell: ({ row }) => {
        const val = parseFloat(row.original.attendance[0]?.saleAmount || "0");
        return <span className="font-mono text-xs">{val > 0 ? val.toLocaleString() : "-"}</span>;
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + parseFloat(row.original.attendance[0]?.saleAmount || "0"), 0);
        return <span className="font-mono text-xs">{total > 0 ? total.toLocaleString() : "0"}</span>;
      }
    },
    {
      header: "Recovery",
      accessorFn: (row) => row.attendance[0]?.recoveryAmount || "0",
      cell: ({ row }) => {
        const val = parseFloat(row.original.attendance[0]?.recoveryAmount || "0");
        return <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{val > 0 ? val.toLocaleString() : "-"}</span>;
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + parseFloat(row.original.attendance[0]?.recoveryAmount || "0"), 0);
        return <span className="font-mono text-xs text-blue-700 dark:text-blue-400">{total > 0 ? total.toLocaleString() : "0"}</span>;
      }
    },
    {
      header: "Return",
      cell: ({ row }) => {
        const val = parseFloat(row.original.attendance[0]?.returnAmount || "0");
        return <span className="font-mono text-xs text-rose-600">{val > 0 ? val.toLocaleString() : "-"}</span>;
      },
    },
    {
      header: "Shop",
      cell: ({ row }) => <span className="text-[10px] uppercase">{row.original.attendance[0]?.shopType || "-"}</span>,
    },
    {
      header: "Slips",
      cell: ({ row }) => {
        const slips = row.original.attendance[0]?.slipNumbers;
        return <span className="text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] inline-block" title={slips || undefined}>{slips || "-"}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none text-muted-foreground hover:bg-muted"
            onClick={() => handleEdit(row.original)}
            title="Edit Log"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none text-muted-foreground hover:bg-muted"
            asChild
            title="View Marketing Details"
          >
            <Link to="/hr/order-booker-details/$employeeId" params={{ employeeId: row.original.id }}>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const standardData = data.filter((e) => !e.isOrderBooker);
  const orderBookerData = data.filter((e) => e.isOrderBooker);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="standard" className="gap-2">
            <Users className="h-4 w-4" />
            Standard Staff
          </TabsTrigger>
          <TabsTrigger value="orderbooker" className="gap-2">
            <Zap className="h-4 w-4" />
            Order Bookers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="mt-0 focus-visible:outline-none">
          <DataTable
            columns={standardColumns}
            data={standardData}
            className="border border-border/60 rounded-none shadow-none"
            pageSize={100}
            showSearch={false}
            showPagination={false}
            showFooter={false}
          />
        </TabsContent>

        <TabsContent value="orderbooker" className="mt-0 focus-visible:outline-none">
          <DataTable
            columns={orderBookerColumns}
            data={orderBookerData}
            className="border border-border/60 rounded-none shadow-none"
            pageSize={100}
            showSearch={false}
            showPagination={false}
            showFooter={true}
          />
        </TabsContent>
      </Tabs>

      {selectedEmployee && (
        <EditAttendanceSheet
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          employee={selectedEmployee}
          attendance={selectedEmployee.attendance[0]}
          date={date}
        />
      )}
    </div>
  );
};