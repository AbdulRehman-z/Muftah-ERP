import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/finance/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/admin/finance/dashboard"!</div>;
}

// import { createFileRoute } from '@tanstack/react-router'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// // import { zodResolver } from "@hookform/resolvers/zod"
// // import { useForm, Controller } from "react-hook-form"
// import { z } from "zod"
// import {
//     Card,
//     CardContent,
//     CardHeader,
//     CardTitle,
//     CardDescription
// } from "@/components/ui/card"
// import {
//     Table,
//     TableBody,
//     TableCell,
//     TableHead,
//     TableHeader,
//     TableRow
// } from "@/components/ui/table"
// import {
//     Field,
//     FieldLabel,
//     FieldError
// } from "@/components/ui/field"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Badge } from "@/components/ui/badge"
// import { Loader2, TrendingUp, TrendingDown, Wallet, Plus, CircleDollarSign } from "lucide-react"
// import { toast } from "sonner"
// import { cn } from '@/lib/utils'

// export const Route = createFileRoute('/admin/finance/expenses')({
//     component: FinanceDashboard,
// })

// const expenseSchema = z.object({
//     description: z.string().min(1, "Required"),
//     category: z.string().min(1, "Required"),
//     amount: z.coerce.number().positive(),
//     walletId: z.string().min(1, "Select Account"),
// })

// function FinanceDashboard() {
//     const queryClient = useQueryClient()
//     const { data, isLoading, error } = useQuery({
//         queryKey: ['finance-overview'],
//         queryFn: async () => {
//             const res = await fetch(`${BACKEND_URL}/finance/overview`)
//             if (!res.ok) throw new Error('Failed to fetch finance overview')
//             return res.json()
//         }
//     })

//     const { mutate: logExpense, isPending: loggingExpense } = useMutation({
//         mutationFn: async (values: z.infer<typeof expenseSchema>) => {
//             const res = await fetch(`${BACKEND_URL}/finance/add-expense`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(values)
//             })
//             if (!res.ok) {
//                 const err = await res.json()
//                 throw new Error(err.error || 'Failed to log expense')
//             }
//         },
//         onSuccess: () => {
//             toast.success("Expense logged!")
//             queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
//             form.reset()
//         },
//         onError: (e) => toast.error(e.message)
//     })

//     const form = useForm<z.infer<typeof expenseSchema>>({
//         resolver: zodResolver(expenseSchema) as any,
//         defaultValues: { description: "", category: "", amount: 0, walletId: "" }
//     })

//     if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
//     if (error) return <div className="p-10 text-destructive text-center">Error loading finance data</div>

//     const { wallets, summary } = data

//     return (
//         <div className="container mx-auto p-6 space-y-6">
//             <div className="flex justify-between items-center">
//                 <div>
//                     <h1 className="text-2xl font-bold tracking-tight">Finance & Cashflow</h1>
//                     <p className="text-muted-foreground">Manage wallets, expenses, and track net profitability.</p>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <Card className="bg-green-500/5 border-green-500/20">
//                     <CardHeader className="pb-2">
//                         <CardTitle className="text-sm font-medium flex items-center gap-2">
//                             <TrendingUp className="size-4 text-green-500" /> Total Revenue
//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                         <div className="text-2xl font-bold text-green-600">Rs. {Number(summary.revenue).toLocaleString()}</div>
//                     </CardContent>
//                 </Card>
//                 <Card className="bg-red-500/5 border-red-500/20">
//                     <CardHeader className="pb-2">
//                         <CardTitle className="text-sm font-medium flex items-center gap-2">
//                             <TrendingDown className="size-4 text-red-500" /> Total Expenses
//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                         <div className="text-2xl font-bold text-red-600">Rs. {Number(summary.expenses).toLocaleString()}</div>
//                     </CardContent>
//                 </Card>
//                 <Card className="bg-primary/5 border-primary/20">
//                     <CardHeader className="pb-2">
//                         <CardTitle className="text-sm font-medium flex items-center gap-2">
//                             <CircleDollarSign className="size-4 text-primary" /> Net Profit
//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                         <div className={cn("text-2xl font-bold", summary.netProfit >= 0 ? "text-primary" : "text-destructive")}>
//                             Rs. {Number(summary.netProfit).toLocaleString()}
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
//                 <Card className="md:col-span-8">
//                     <CardHeader>
//                         <CardTitle className="flex items-center gap-2">
//                             <Wallet className="size-5" /> Accounts & Wallets
//                         </CardTitle>
//                         <CardDescription>Current balance in cash drawers and bank accounts.</CardDescription>
//                     </CardHeader>
//                     <CardContent>
//                         <Table>
//                             <TableHeader>
//                                 <TableRow>
//                                     <TableHead>Account Name</TableHead>
//                                     <TableHead>Type</TableHead>
//                                     <TableHead className="text-right">Balance</TableHead>
//                                 </TableRow>
//                             </TableHeader>
//                             <TableBody>
//                                 {wallets.map((w: any) => (
//                                     <TableRow key={w.id}>
//                                         <TableCell className="font-medium">{w.name}</TableCell>
//                                         <TableCell>
//                                             <Badge variant="outline" className="capitalize">{w.type}</Badge>
//                                         </TableCell>
//                                         <TableCell className="text-right font-mono font-bold">
//                                             Rs. {Number(w.balance).toLocaleString()}
//                                         </TableCell>
//                                     </TableRow>
//                                 ))}
//                             </TableBody>
//                         </Table>
//                     </CardContent>
//                 </Card>

//                 <Card className="md:col-span-4">
//                     <CardHeader>
//                         <CardTitle className="flex items-center gap-2">
//                             <Plus className="size-5" /> Log Expense
//                         </CardTitle>
//                         <CardDescription>Quickly record a business expense.</CardDescription>
//                     </CardHeader>
//                     <CardContent>
//                         <form onSubmit={form.handleSubmit((v) => logExpense(v))} className="space-y-4">
//                             <Controller
//                                 control={form.control}
//                                 name="description"
//                                 render={({ field, fieldState }) => (
//                                     <Field>
//                                         <FieldLabel>Description</FieldLabel>
//                                         <Input placeholder="e.g. Electricity Bill" {...field} />
//                                         <FieldError errors={[fieldState.error]} />
//                                     </Field>
//                                 )}
//                             />
//                             <div className="grid grid-cols-2 gap-4">
//                                 <Controller
//                                     control={form.control}
//                                     name="category"
//                                     render={({ field }) => (
//                                         <Field>
//                                             <FieldLabel>Category</FieldLabel>
//                                             <Select value={field.value} onValueChange={field.onChange}>
//                                                 <SelectTrigger><SelectValue /></SelectTrigger>
//                                                 <SelectContent>
//                                                     <SelectItem value="Utility">Utility</SelectItem>
//                                                     <SelectItem value="Fuel">Fuel</SelectItem>
//                                                     <SelectItem value="Rent">Rent</SelectItem>
//                                                     <SelectItem value="Misc">Misc</SelectItem>
//                                                 </SelectContent>
//                                             </Select>
//                                         </Field>
//                                     )}
//                                 />
//                                 <Controller
//                                     control={form.control}
//                                     name="amount"
//                                     render={({ field, fieldState }) => (
//                                         <Field>
//                                             <FieldLabel>Amount</FieldLabel>
//                                             <Input type="number" {...field} />
//                                             <FieldError errors={[fieldState.error]} />
//                                         </Field>
//                                     )}
//                                 />
//                             </div>
//                             <Controller
//                                 control={form.control}
//                                 name="walletId"
//                                 render={({ field, fieldState }) => (
//                                     <Field>
//                                         <FieldLabel>Pay From</FieldLabel>
//                                         <Select value={field.value} onValueChange={field.onChange}>
//                                             <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
//                                             <SelectContent>
//                                                 {wallets.map((w: any) => (
//                                                     <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
//                                                 ))}
//                                             </SelectContent>
//                                         </Select>
//                                         <FieldError errors={[fieldState.error]} />
//                                     </Field>
//                                 )}
//                             />
//                             <Button type="submit" className="w-full" disabled={loggingExpense}>
//                                 {loggingExpense ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
//                                 Record Expense
//                             </Button>
//                         </form>
//                     </CardContent>
//                 </Card>
//             </div>
//         </div>
//     )
// }
