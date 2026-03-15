import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/custom/data-table";
import { Button } from "@/components/ui/button";
import { Edit2, ExternalLink, Clock, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { EditAttendanceSheet } from "./edit-attendance-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ... (Keep all your existing interfaces: AttendanceRecord, EmployeeWithAttendance, Props)
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

// Helper for beautiful avatars
const getInitials = (first: string, last: string) => {
  return `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();
};

// Helper for Status Badges
const StatusBadge = ({ status }: { status: AttendanceRecord["status"] | undefined }) => {
  if (!status) return <span className="text-muted-foreground text-[13px] font-medium">No Record</span>;

  const variants = {
    present: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400",
    absent: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400",
    leave: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400",
    holiday: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400",
  };

  return (
    <Badge variant="secondary" className={cn("capitalize font-medium text-[11px] px-2 py-0.5", variants[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
};

export const AttendanceListTable = ({ data, date }: Props) => {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithAttendance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEdit = (employee: EmployeeWithAttendance) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const standardColumns: ColumnDef<EmployeeWithAttendance>[] = [
    {
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {getInitials(row.original.firstName, row.original.lastName)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[13px] text-foreground leading-tight">
              {row.original.firstName} {row.original.lastName}
            </span>
            <span className="text-[12px] text-muted-foreground/80 leading-tight mt-0.5">
              {row.original.designation}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.attendance[0]?.status} />,
    },
    {
      header: "Check-In",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5 opacity-70" />
          <span className="text-[13px] font-medium text-foreground">
            {row.original.attendance[0]?.checkIn || "--:--"}
          </span>
        </div>
      ),
    },
    {
      header: "Check-Out",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5 opacity-70" />
          <span className="text-[13px] font-medium text-foreground">
            {row.original.attendance[0]?.checkOut || "--:--"}
          </span>
        </div>
      ),
    },
    {
      header: "Duty Hrs",
      cell: ({ row }) => (
        <span className="text-[13px] font-medium">
          {row.original.attendance[0]?.dutyHours ? `${row.original.attendance[0].dutyHours}h` : "-"}
        </span>
      ),
    },
    {
      header: "O/T Hrs",
      cell: ({ row }) => {
        const ot = row.original.attendance[0]?.overtimeHours;
        if (!ot) return <span className="text-muted-foreground">-</span>;
        return <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-500">{ot}h</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={() => handleEdit(row.original)}
            title="Edit Attendance"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            asChild
            title="View Details"
          >
            <Link to="/hr/attendance/$employeeId" params={{ employeeId: row.original.id }}>
              <ExternalLink className="size-3.5" />
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
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {getInitials(row.original.firstName, row.original.lastName)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[13px] text-foreground leading-tight">
              {row.original.firstName} {row.original.lastName}
            </span>
            <span className="text-[12px] text-muted-foreground/80 leading-tight mt-0.5">
              {row.original.designation}
            </span>
          </div>
        </div>
      ),
      footer: () => <div className="text-[13px] font-semibold text-muted-foreground">TOTALS</div>,
    },
    {
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.attendance[0]?.status} />,
    },
    {
      header: "Area",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {row.original.attendance[0]?.areaVisited && <MapPin className="size-3.5 opacity-70" />}
          <span className="text-[13px] font-medium text-foreground truncate max-w-[120px]">
            {row.original.attendance[0]?.areaVisited || "-"}
          </span>
        </div>
      ),
    },
    {
      id: "distance", // Added required ID
      header: () => <div className="text-right">Distance</div>,
      accessorFn: (row) => row.attendance[0]?.distanceKm || "0",
      cell: ({ row }) => (
        <div className="text-right text-[13px] font-medium">
          {row.original.attendance[0]?.distanceKm ? `${row.original.attendance[0].distanceKm} km` : "-"}
        </div>
      ),
    },
    {
      id: "dynamicTa", // Added ID for safety on custom columns
      header: () => <div className="text-right">Dyn. TA</div>,
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (!record || record.paymentMode !== "per_km") return <div className="text-right text-muted-foreground">-</div>;
        const ta = parseFloat(record.distanceKm || "0") * parseFloat(record.perKmRate || "0");
        return <div className="text-right text-[13px] font-semibold text-foreground">{ta > 0 ? ta.toLocaleString() : "-"}</div>;
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
          const rec = row.original.attendance[0];
          if (rec?.paymentMode === "per_km") {
            return sum + (parseFloat(rec.distanceKm || "0") * parseFloat(rec.perKmRate || "0"));
          }
          return sum;
        }, 0);
        return <div className="text-right text-[13px] font-semibold text-emerald-600 dark:text-emerald-500">{total > 0 ? total.toLocaleString() : "0"}</div>;
      }
    },
    {
      id: "sale", // Added required ID
      header: () => <div className="text-right">Sale</div>,
      accessorFn: (row) => row.attendance[0]?.saleAmount || "0",
      cell: ({ row }) => {
        const val = parseFloat(row.original.attendance[0]?.saleAmount || "0");
        return <div className="text-right text-[13px] font-medium">{val > 0 ? val.toLocaleString() : "-"}</div>;
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + parseFloat(row.original.attendance[0]?.saleAmount || "0"), 0);
        return <div className="text-right text-[13px] font-semibold">{total > 0 ? total.toLocaleString() : "0"}</div>;
      }
    },
    {
      id: "recovery", // Added required ID
      header: () => <div className="text-right">Recovery</div>,
      accessorFn: (row) => row.attendance[0]?.recoveryAmount || "0",
      cell: ({ row }) => {
        const val = parseFloat(row.original.attendance[0]?.recoveryAmount || "0");
        return <div className="text-right text-[13px] font-semibold text-blue-600 dark:text-blue-400">{val > 0 ? val.toLocaleString() : "-"}</div>;
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + parseFloat(row.original.attendance[0]?.recoveryAmount || "0"), 0);
        return <div className="text-right text-[13px] font-semibold text-blue-600 dark:text-blue-400">{total > 0 ? total.toLocaleString() : "0"}</div>;
      }
    },
    {
      id: "returnAmount", // Added ID for safety on custom columns
      header: () => <div className="text-right">Return</div>,
      cell: ({ row }) => {
        const val = parseFloat(row.original.attendance[0]?.returnAmount || "0");
        return <div className="text-right text-[13px] font-medium text-rose-600 dark:text-rose-500">{val > 0 ? val.toLocaleString() : "-"}</div>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={() => handleEdit(row.original)}
            title="Edit Log"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            asChild
            title="View Marketing Details"
          >
            <Link to="/hr/order-booker-details/$employeeId" params={{ employeeId: row.original.id }}>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const standardData = data.filter((e) => !e.isOrderBooker);
  const orderBookerData = data.filter((e) => e.isOrderBooker);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Tabs defaultValue="standard" className="w-full">
        {/* Premium segmented control look for the Tabs */}
        <div className="flex justify-between items-end mb-4">
          <TabsList className="bg-muted/50 p-1 h-10 rounded-lg">
            <TabsTrigger value="standard" className="gap-2 px-4 text-[13px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="size-3.5" />
              Standard Staff
            </TabsTrigger>
            <TabsTrigger value="orderbooker" className="gap-2 px-4 text-[13px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Zap className="size-3.5" />
              Order Bookers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="standard" className="mt-0 focus-visible:outline-none">
          <DataTable
            columns={standardColumns}
            data={standardData}
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