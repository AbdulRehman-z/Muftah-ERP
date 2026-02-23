
"use client"

import * as React from "react"
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
} from "@tanstack/react-table"
import { SlidersHorizontal, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    searchValue?: string
    onSearchChange?: (value: string) => void
    showSearch?: boolean
    showViewOptions?: boolean
    showPagination?: boolean
    pageSize?: number
    actions?: React.ReactNode
    className?: string
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
    pageSize = 10,
    actions,
    className,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

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
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
        initialState: {
            pagination: {
                pageSize: pageSize,
            },
        },
    })

    // Default to 10 rows per page, but maybe configurable?
    // shadcn default is often 10.

    return (
        <div className={cn("w-full", className)}>
            {(showSearch || showViewOptions) && (
                <div className="flex items-center py-4 px-4 gap-2">
                    {showSearch && (searchKey || onSearchChange) && (
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchValue ?? (searchKey ? table.getColumn(searchKey)?.getFilterValue() as string : "") ?? ""}
                            onChange={(event) => {
                                if (onSearchChange) {
                                    onSearchChange(event.target.value)
                                } else if (searchKey) {
                                    table.getColumn(searchKey)?.setFilterValue(event.target.value)
                                }
                            }}
                            className="max-w-xs h-9 bg-background border-muted-foreground/20 rounded-lg focus-visible:ring-primary/20 text-xs"
                        />
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        {actions}
                        {showViewOptions && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 border-muted-foreground/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-all gap-2">
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        View
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-xl border-muted-foreground/10">
                                    {table
                                        .getAllColumns()
                                        .filter((column) => column.getCanHide())
                                        .map((column) => {
                                            return (
                                                <DropdownMenuCheckboxItem
                                                    key={column.id}
                                                    className="capitalize rounded-lg m-1 font-medium text-xs py-2"
                                                    checked={column.getIsVisible()}
                                                    onCheckedChange={(value) =>
                                                        column.toggleVisibility(!!value)
                                                    }
                                                >
                                                    {column.id}
                                                </DropdownMenuCheckboxItem>
                                            )
                                        })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            )}
            <div className="">
                <Table>
                    <TableHeader className="bg-muted/10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="text-[9px]  uppercase tracking-wider text-muted-foreground/60 py-3 h-auto border-y bg-muted/10 border-border/50">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-muted/10 border-border/20 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-32 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                                        <div className="p-3 bg-muted rounded-full">
                                            <Trash2 className="size-6" />
                                        </div>
                                        <p className="text-sm font-medium">No results found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {showPagination && (
                <div className="flex items-center justify-end space-x-2 py-4 px-4 bg-muted/5 border-t">

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-8 px-4 rounded-lg bg-background border-muted-foreground/20 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 disabled:opacity-30 transition-all"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-8 px-4 rounded-lg bg-background border-muted-foreground/20 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 disabled:opacity-30 transition-all"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
