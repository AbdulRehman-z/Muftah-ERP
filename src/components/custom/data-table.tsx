"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  showViewOptions?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  actions?: React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
  showFooter?: boolean;
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: { pageIndex: number; pageSize: number };
  onPaginationChange?: (updater: any) => void;
  autoResetPageIndex?: boolean;
  totalRecords?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filter...",
  searchValue,
  onSearchChange,
  showSearch = true,
  showViewOptions = true,
  showPagination = true,
  pageSize = 7,
  actions,
  className,
  emptyState,
  showFooter = false,
  manualPagination = false,
  pageCount = -1,
  pagination,
  onPaginationChange,
  autoResetPageIndex = true,
  totalRecords,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination,
    ...(pageCount !== -1 ? { pageCount } : {}),
    ...(onPaginationChange ? { onPaginationChange } : {}),
    autoResetPageIndex,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      ...(pagination !== undefined ? { pagination } : {}),
    },
    initialState: {
      ...(pagination === undefined ? { pagination: { pageSize } } : {}),
    },
  });

  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  const showToolbar = showSearch || showViewOptions;

  return (
    <div className={cn("w-full rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs", className)}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {showToolbar && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/10">
          {showSearch && (searchKey || onSearchChange) && (
            <Input
              placeholder={searchPlaceholder}
              value={
                searchValue ??
                (searchKey
                  ? (table.getColumn(searchKey)?.getFilterValue() as string)
                  : "") ??
                ""
              }
              onChange={(event) => {
                if (onSearchChange) {
                  onSearchChange(event.target.value);
                } else if (searchKey) {
                  table.getColumn(searchKey)?.setFilterValue(event.target.value);
                }
                table.setPageIndex(0);
              }}
              className="max-w-xs h-9 bg-background border-border/40 rounded-lg focus-visible:ring-primary/20 text-xs"
            />
          )}
          <div className="flex items-center gap-2 ml-auto">
            {actions}
            {showViewOptions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-border/40 rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-all gap-1.5"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    View
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-xl border-border/40">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize rounded-lg m-1 font-medium text-xs py-2"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/40">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-3.5 h-auto border-none first:pl-5 last:pr-5"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/20 border-b border-border/20 transition-colors last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 first:pl-5 last:pr-5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center p-0">
                  {emptyState ?? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 opacity-40">
                      <p className="text-sm font-medium">No results found.</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {showFooter && (
            <tfoot className="bg-muted/30 border-t border-border/40">
              {table.getFooterGroups().map((footerGroup) => (
                <TableRow key={footerGroup.id} className="hover:bg-transparent border-0">
                  {footerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      className="text-[11px] font-black uppercase tracking-widest text-foreground py-3 h-auto border-none first:pl-5 last:pr-5"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.footer, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </tfoot>
          )}
        </Table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {showPagination && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Page <span className="text-foreground">{currentPage + 1}</span> of{" "}
            <span className="text-foreground">{Math.max(1, totalPages)}</span>
            <span className="mx-2 opacity-30">•</span>
            <span className="text-foreground">{totalRecords ?? table.getFilteredRowModel().rows.length}</span> records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-4 rounded-lg border-border/40 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 disabled:opacity-30 transition-all"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-4 rounded-lg border-border/40 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 disabled:opacity-30 transition-all"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
