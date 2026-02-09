import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { getMaterialsFn } from "@/server-functions/inventory/get-materials-fn";
import { getProductsFn } from "@/server-functions/inventory/get-products-fn";
import { ResponsiveDialog } from "../custom/responsive-dialog";
import { Button } from "../ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useTransferStock } from "@/hooks/stock/use-transfer-stock";

import { type Warehouse } from "@/lib/types";
import { Badge } from "../ui/badge";

interface TransferStockDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	warehouses: Warehouse[];
	defaultValues?: {
		fromWarehouseId?: string;
		toWarehouseId?: string;
		materialType?: "chemical" | "packaging" | "finished";
		materialId?: string;
		quantity?: string;
	};
}

export const TransferStockDialog = ({
	open,
	onOpenChange,
	warehouses,
	defaultValues,
}: TransferStockDialogProps) => {
	const [materialType, setMaterialType] = useState<
		"chemical" | "packaging" | "finished"
	>(defaultValues?.materialType || "chemical");

	const { data: materials } = useSuspenseQuery({
		queryKey: ["materials"],
		queryFn: getMaterialsFn,
	});

	const { data: products } = useSuspenseQuery({
		queryKey: ["products"],
		queryFn: getProductsFn,
	});

	const mutate = useTransferStock();

	const form = useForm({
		defaultValues: {
			fromWarehouseId: defaultValues?.fromWarehouseId || "",
			toWarehouseId: defaultValues?.toWarehouseId || "",
			materialType: defaultValues?.materialType || "chemical",
			materialId: defaultValues?.materialId || "",
			quantity: defaultValues?.quantity || "0",
			looseUnits: "0",
			notes: "",
		},
		onSubmit: async ({ value }) => {
			await mutate.mutateAsync(
				{ data: value },
				{
					onSuccess: () => {
						onOpenChange(false);
						form.reset();
					},
				},
			);
		},
	});

	const availableMaterials =
		materialType === "chemical"
			? materials.chemicals
			: materialType === "packaging"
				? materials.packagings
				: products.flatMap((p) => p.recipes);

	return (
		<ResponsiveDialog
			title="Transfer Stock"
			description="Move materials or finished goods between warehouses"
			open={open}
			onOpenChange={onOpenChange}
		>
			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<FieldGroup>
					{/* From Warehouse */}
					<form.Field name="fromWarehouseId">
						{(field) => (
							<Field>
								<FieldLabel>From Warehouse</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => field.handleChange(value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select source" />
									</SelectTrigger>
									<SelectContent>
										{warehouses.map((w) => (
											<SelectItem key={w.id} value={w.id}>
												<div className="flex items-center gap-2">
													{w.name}
													{!w.isActive && (
														<Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
															Inactive
														</Badge>
													)}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					{/* To Warehouse */}
					<form.Field name="toWarehouseId">
						{(field) => (
							<Field>
								<FieldLabel>To Warehouse</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => field.handleChange(value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select destination" />
									</SelectTrigger>
									<SelectContent>
										{warehouses
											.filter(w => w.isActive && w.id !== form.getFieldValue("fromWarehouseId"))
											.map((w) => (
												<SelectItem key={w.id} value={w.id}>
													{w.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					{/* Material Type */}
					<form.Field name="materialType">
						{(field) => (
							<Field>
								<FieldLabel>Material Type</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => {
										const typedValue = value as
											| "chemical"
											| "packaging"
											| "finished";
										field.handleChange(typedValue);
										setMaterialType(typedValue);
										form.setFieldValue("materialId", "");
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="chemical">Raw Material</SelectItem>
										<SelectItem value="packaging">Packaging</SelectItem>
										<SelectItem value="finished">Finished Goods</SelectItem>
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					{/* Material Selection */}
					<form.Field name="materialId">
						{(field) => (
							<Field>
								<FieldLabel>
									{materialType === "finished" ? "Recipe" : "Material"}
								</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => field.handleChange(value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select material" />
									</SelectTrigger>
									<SelectContent>
										{availableMaterials.map((m) => (
											<SelectItem key={m.id} value={m.id}>
												{m.name}{" "}
												{"unit" in m && materialType !== "finished"
													? `(${m.unit})`
													: ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					{/* Quantity Section */}
					<div className="flex gap-4">
						<form.Field name="quantity">
							{(field) => (
								<Field className="flex-1">
									<FieldLabel>
										{materialType === "finished" ? "Cartons" : "Quantity"}
									</FieldLabel>
									<Input
										type="number"
										step={materialType === "finished" ? "1" : "0.001"}
										placeholder={materialType === "finished" ? "0" : "Enter quantity"}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						{materialType === "finished" && (
							<form.Field name="looseUnits">
								{(field) => (
									<Field className="flex-1">
										<FieldLabel>Loose Units (Packs)</FieldLabel>
										<Input
											type="number"
											step="1"
											placeholder="0"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										<FieldError errors={field.state.meta.errors} />
									</Field>
								)}
							</form.Field>
						)}
					</div>

					{/* Notes */}
					<form.Field name="notes">
						{(field) => (
							<Field>
								<FieldLabel>Notes (Optional)</FieldLabel>
								<Textarea
									placeholder="Transfer reason or notes"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<div className="flex gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={form.state.isSubmitting}
							className="flex-1"
						>
							{form.state.isSubmitting ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Transfer
						</Button>
					</div>
				</FieldGroup>
			</form>
		</ResponsiveDialog>
	);
};
