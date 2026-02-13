import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/sales/new-invoice/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/sales/new-invoice/"!</div>;
}

// import { zodResolver } from "@hookform/resolvers/zod";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { createFileRoute } from "@tanstack/react-router";
// import { Loader2, Plus, ReceiptText, Trash } from "lucide-react";
// import { Controller, useFieldArray, useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import {
// 	Card,
// 	CardContent,
// 	CardDescription,
// 	CardHeader,
// 	CardTitle,
// } from "@/components/ui/card";
// import { Field, FieldError, FieldLabel } from "@/components/ui/field";
// import { Input } from "@/components/ui/input";
// import {
// 	Select,
// 	SelectContent,
// 	SelectItem,
// 	SelectTrigger,
// 	SelectValue,
// } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";

// const invoiceSchema = z.object({
// 	customerId: z.string().optional(),
// 	warehouseId: z.string().min(1, "Warehouse required"),
// 	walletId: z.string().min(1, "Select Payment Account"),
// 	items: z
// 		.array(
// 			z.object({
// 				variantId: z.string().min(1, "Select Product"),
// 				quantityCartons: z.coerce.number().int().min(1, "Min 1 carton"),
// 				unitPrice: z.coerce.number().min(1, "Price required"),
// 			}),
// 		)
// 		.min(1, "Add at least one item"),
// });

// type InvoiceValues = z.infer<typeof invoiceSchema>;

// export const Route = createFileRoute("/sales/new-invoice")({
// 	component: NewInvoicePage,
// });

// function NewInvoicePage() {
// 	const queryClient = useQueryClient();

// 	const { data: setup, isLoading } = useQuery({
// 		queryKey: ["invoice-setup"],
// 		queryFn: async () => {
// 			const [customers, warehouses, variants, wallets] = await Promise.all([
// 				fetch(`${BACKEND_URL}/sales/customers`).then((r) => r.json()),
// 				fetch(`${BACKEND_URL}/manufacturing/warehouses`).then((r) => r.json()),
// 				fetch(`${BACKEND_URL}/manufacturing/variants`).then((r) => r.json()),
// 				fetch(`${BACKEND_URL}/finance/wallets`).then((r) => r.json()),
// 			]);
// 			return { customers, warehouses, variants, wallets };
// 		},
// 	});

// 	const { mutate: createInvoice, isPending } = useMutation({
// 		mutationFn: async (values: InvoiceValues) => {
// 			const res = await fetch(`${BACKEND_URL}/sales/create-invoice`, {
// 				method: "POST",
// 				headers: { "Content-Type": "application/json" },
// 				body: JSON.stringify(values),
// 			});
// 			if (!res.ok) {
// 				const err = await res.json();
// 				throw new Error(err.error || "Failed to create invoice");
// 			}
// 			return res.json();
// 		},
// 		onSuccess: () => {
// 			toast.success("Invoice created successfully!");
// 			queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
// 			queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
// 			form.reset();
// 		},
// 		onError: (e) => toast.error(e.message),
// 	});

// 	const form = useForm<InvoiceValues>({
// 		resolver: zodResolver(invoiceSchema) as any,
// 		defaultValues: {
// 			customerId: undefined,
// 			warehouseId: "",
// 			walletId: "",
// 			items: [{ variantId: "", quantityCartons: 1, unitPrice: 0 }],
// 		},
// 	});

// 	const { fields, append, remove } = useFieldArray({
// 		control: form.control,
// 		name: "items",
// 	});

// 	if (isLoading)
// 		return (
// 			<div className="flex justify-center p-20">
// 				<Loader2 className="animate-spin" />
// 			</div>
// 		);

// 	const watchItems = form.watch("items");
// 	const totalAmount = watchItems.reduce(
// 		(acc, item) => acc + item.quantityCartons * item.unitPrice,
// 		0,
// 	);

// 	function onSubmit(values: InvoiceValues) {
// 		createInvoice(values);
// 	}

// 	return (
// 		<div className="container mx-auto p-6 max-w-4xl">
// 			<Card>
// 				<CardHeader>
// 					<div className="flex items-center gap-2 mb-2">
// 						<div className="p-2 bg-primary/10 rounded-full">
// 							<ReceiptText className="size-5 text-primary" />
// 						</div>
// 						<CardTitle>Create New Invoice</CardTitle>
// 					</div>
// 					<CardDescription>
// 						Generate individual invoices and Record Payment.
// 					</CardDescription>
// 				</CardHeader>
// 				<CardContent>
// 					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
// 						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
// 							<Controller
// 								control={form.control}
// 								name="warehouseId"
// 								render={({ field, fieldState }) => (
// 									<Field>
// 										<FieldLabel>Dispatch From (Warehouse)</FieldLabel>
// 										<Select value={field.value} onValueChange={field.onChange}>
// 											<SelectTrigger>
// 												<SelectValue placeholder="Select Warehouse" />
// 											</SelectTrigger>
// 											<SelectContent>
// 												{setup?.warehouses.map((w: any) => (
// 													<SelectItem key={w.id} value={w.id}>
// 														{w.name}
// 													</SelectItem>
// 												))}
// 											</SelectContent>
// 										</Select>
// 										<FieldError errors={[fieldState.error]} />
// 									</Field>
// 								)}
// 							/>

// 							<Controller
// 								control={form.control}
// 								name="walletId"
// 								render={({ field, fieldState }) => (
// 									<Field>
// 										<FieldLabel>Deposit Into (Account)</FieldLabel>
// 										<Select value={field.value} onValueChange={field.onChange}>
// 											<SelectTrigger>
// 												<SelectValue placeholder="Select Wallet" />
// 											</SelectTrigger>
// 											<SelectContent>
// 												{setup?.wallets.map((w: any) => (
// 													<SelectItem key={w.id} value={w.id}>
// 														{w.name}
// 													</SelectItem>
// 												))}
// 											</SelectContent>
// 										</Select>
// 										<FieldError errors={[fieldState.error]} />
// 									</Field>
// 								)}
// 							/>
// 						</div>

// 						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
// 							<Controller
// 								control={form.control}
// 								name="customerId"
// 								render={({ field }) => (
// 									<Field>
// 										<FieldLabel>Customer (Optional)</FieldLabel>
// 										<Select value={field.value} onValueChange={field.onChange}>
// 											<SelectTrigger>
// 												<SelectValue placeholder="Select Customer" />
// 											</SelectTrigger>
// 											<SelectContent>
// 												{setup?.customers.map((c: any) => (
// 													<SelectItem key={c.id} value={c.id}>
// 														{c.name}
// 													</SelectItem>
// 												))}
// 											</SelectContent>
// 										</Select>
// 									</Field>
// 								)}
// 							/>
// 						</div>

// 						<Separator />

// 						<div className="space-y-4">
// 							<div className="flex justify-between items-center">
// 								<h3 className="font-semibold">Invoice Items</h3>
// 								<Button
// 									type="button"
// 									variant="outline"
// 									size="sm"
// 									onClick={() =>
// 										append({ variantId: "", quantityCartons: 1, unitPrice: 0 })
// 									}
// 								>
// 									<Plus className="size-4 mr-1" /> Add Product
// 								</Button>
// 							</div>

// 							{fields.map((field, index) => (
// 								<div
// 									key={field.id}
// 									className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/30 p-4 rounded-lg"
// 								>
// 									<div className="md:col-span-5">
// 										<Controller
// 											control={form.control}
// 											name={`items.${index}.variantId`}
// 											render={({ field, fieldState }) => (
// 												<Field>
// 													<FieldLabel>Product Variant</FieldLabel>
// 													<Select
// 														value={field.value}
// 														onValueChange={(val) => {
// 															field.onChange(val);
// 															const v = setup?.variants.find(
// 																(v: any) => v.id === val,
// 															);
// 															if (v?.retailPrice) {
// 																form.setValue(
// 																	`items.${index}.unitPrice`,
// 																	Number(v.retailPrice),
// 																);
// 															}
// 														}}
// 													>
// 														<SelectTrigger>
// 															<SelectValue placeholder="Select SKU" />
// 														</SelectTrigger>
// 														<SelectContent>
// 															{setup?.variants.map((v: any) => (
// 																<SelectItem key={v.id} value={v.id}>
// 																	{v.name} (Stock: {v.stockQuantityCartons})
// 																</SelectItem>
// 															))}
// 														</SelectContent>
// 													</Select>
// 													<FieldError errors={[fieldState.error]} />
// 												</Field>
// 											)}
// 										/>
// 									</div>
// 									<div className="md:col-span-3">
// 										<Controller
// 											control={form.control}
// 											name={`items.${index}.quantityCartons`}
// 											render={({ field, fieldState }) => (
// 												<Field>
// 													<FieldLabel>Cartons</FieldLabel>
// 													<Input type="number" {...field} />
// 													<FieldError errors={[fieldState.error]} />
// 												</Field>
// 											)}
// 										/>
// 									</div>
// 									<div className="md:col-span-3">
// 										<Controller
// 											control={form.control}
// 											name={`items.${index}.unitPrice`}
// 											render={({ field, fieldState }) => (
// 												<Field>
// 													<FieldLabel>Price</FieldLabel>
// 													<Input type="number" {...field} />
// 													<FieldError errors={[fieldState.error]} />
// 												</Field>
// 											)}
// 										/>
// 									</div>
// 									<div className="md:col-span-1 pb-1">
// 										{fields.length > 1 && (
// 											<Button
// 												type="button"
// 												variant="ghost"
// 												size="icon"
// 												onClick={() => remove(index)}
// 											>
// 												<Trash className="size-4 text-destructive" />
// 											</Button>
// 										)}
// 									</div>
// 								</div>
// 							))}
// 						</div>

// 						<div className="flex flex-col items-end pt-4 space-y-2 border-t">
// 							<div className="text-sm text-muted-foreground uppercase tracking-wider">
// 								Grand Total
// 							</div>
// 							<div className="text-3xl font-bold text-primary">
// 								PKR {totalAmount.toLocaleString()}
// 							</div>
// 						</div>

// 						<Button
// 							type="submit"
// 							className="w-full text-lg h-12"
// 							disabled={isPending}
// 						>
// 							{isPending ? (
// 								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
// 							) : null}
// 							Finalize Sale & Record Payment
// 						</Button>
// 					</form>
// 				</CardContent>
// 			</Card>
// 		</div>
// 	);
// }
