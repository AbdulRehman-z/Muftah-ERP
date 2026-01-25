import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/operator/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/operator/"!</div>;
}

// import { zodResolver } from "@hookform/resolvers";
// import { useForm } from "@tanstack/react-form";
// import { createFileRoute } from "@tanstack/react-router";
// import { Loader2 } from "lucide-react";
// import { toast } from "sonner"; // Assuming sonner or use-toast is configured
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// // import { useProductionRun, useVariants, useWarehouses } from "@/hooks/use-manufacturing"
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

// // Re-defining schema here to avoid strict monorepo linking issues if simple
// // Ideally imported from backend
// const formSchema = z.object({
// 	warehouseId: z.string().min(1, "Warehouse is required"),
// 	variantId: z.string().min(1, "Product is required"),
// 	cartonsProduced: z.coerce.number().min(1, "Must produce at least 1 carton"),
// });

// export const Route = createFileRoute("/operator/dashboard")({
// 	component: OperatorDashboard,
// });

// // Infer the type
// type FormValues = z.infer<typeof formSchema>;

// function OperatorDashboard() {
// 	const { data: variants, isLoading: loadingVariants } = useVariants();
// 	const { data: warehouses, isLoading: loadingWarehouses } = useWarehouses();
// 	const { mutate: submitRun, isPending: submitting } = useProductionRun();

// 	const form = useForm<FormValues>({
// 		// Generic cast to solve strict type incompatibility with current resolver version
// 		resolver: zodResolver(formSchema) as any,
// 		defaultValues: {
// 			warehouseId: "",
// 			variantId: "",
// 			cartonsProduced: 0,
// 		},
// 	});

// 	// Watch for calculation display
// 	const selectedVariantId = form.watch("variantId");
// 	const cartons = form.watch("cartonsProduced");
// 	const selectedVariant = variants?.find((v) => v.id === selectedVariantId);

// 	const calculatedPacks =
// 		selectedVariant && cartons ? cartons * selectedVariant.packsPerCarton : 0;
// 	const calculatedLiquid =
// 		selectedVariant && cartons
// 			? cartons *
// 				selectedVariant.packsPerCarton *
// 				Number(selectedVariant.weightPerPackKg)
// 			: 0;

// 	function onSubmit(values: FormValues) {
// 		submitRun(values, {
// 			onSuccess: () => {
// 				toast.success("Production Run Logged Successfully!");
// 				form.reset({
// 					warehouseId: values.warehouseId, // Keep warehouse selected
// 					variantId: "",
// 					cartonsProduced: 0,
// 				});
// 			},
// 			onError: (err) => {
// 				try {
// 					const e = JSON.parse(err.message);
// 					toast.error(e.error || "Failed to log run");
// 				} catch {
// 					toast.error(err.message || "Failed to log run");
// 				}
// 			},
// 		});
// 	}

// 	if (loadingVariants || loadingWarehouses) {
// 		return (
// 			<div className="flex justify-center p-10">
// 				<Loader2 className="animate-spin" />
// 			</div>
// 		);
// 	}

// 	return (
// 		<div className="container mx-auto p-6 max-w-2xl">
// 			<Card>
// 				<CardHeader>
// 					<CardTitle>Production Input (Operator)</CardTitle>
// 					<CardDescription>Log completed manufacturing runs.</CardDescription>
// 				</CardHeader>
// 				<CardContent>
// 					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
// 						<Controller
// 							control={form.control}
// 							name="warehouseId"
// 							render={({ field, fieldState }) => (
// 								<Field>
// 									<FieldLabel>Warehouse / Location</FieldLabel>
// 									<Select value={field.value} onValueChange={field.onChange}>
// 										<SelectTrigger>
// 											<SelectValue placeholder="Select current location" />
// 										</SelectTrigger>
// 										<SelectContent>
// 											{warehouses?.map((w) => (
// 												<SelectItem key={w.id} value={w.id}>
// 													{w.name}
// 												</SelectItem>
// 											))}
// 										</SelectContent>
// 									</Select>
// 									<FieldError errors={[fieldState.error]} />
// 								</Field>
// 							)}
// 						/>

// 						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// 							<Controller
// 								control={form.control}
// 								name="variantId"
// 								render={({ field, fieldState }) => (
// 									<Field>
// 										<FieldLabel>Product Variant</FieldLabel>
// 										<Select value={field.value} onValueChange={field.onChange}>
// 											<SelectTrigger>
// 												<SelectValue placeholder="Select Product" />
// 											</SelectTrigger>
// 											<SelectContent>
// 												{variants?.map((v) => (
// 													<SelectItem key={v.id} value={v.id}>
// 														{v.name}
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
// 								name="cartonsProduced"
// 								render={({ field, fieldState }) => (
// 									<Field>
// 										<FieldLabel>Cartons Produced</FieldLabel>
// 										<Input
// 											type="number"
// 											{...field}
// 											onChange={(e) => field.onChange(e.target.valueAsNumber)}
// 										/>
// 										<FieldError errors={[fieldState.error]} />
// 									</Field>
// 								)}
// 							/>
// 						</div>

// 						{/* Live Calculation Preview */}
// 						{selectedVariant && cartons > 0 && (
// 							<div className="bg-muted p-4 rounded-md text-sm space-y-2">
// 								<div className="flex justify-between">
// 									<span>Total Packs:</span>
// 									<span className="font-bold">{calculatedPacks} Units</span>
// 								</div>
// 								<div className="flex justify-between">
// 									<span>Liquid to Deduct:</span>
// 									<span className="font-bold text-red-500">
// 										-{calculatedLiquid.toFixed(3)} KG
// 									</span>
// 								</div>
// 							</div>
// 						)}

// 						<Button type="submit" className="w-full" disabled={submitting}>
// 							{submitting ? (
// 								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
// 							) : null}
// 							Confirm Production Run
// 						</Button>
// 					</form>
// 				</CardContent>
// 			</Card>
// 		</div>
// 	);
// }
