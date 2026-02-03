import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { useAddProduct } from "@/hooks/inventory/use-add-product";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const AddProductDialog = ({ open, onOpenChange }: Props) => {
    const mutate = useAddProduct();

    const form = useForm({
        defaultValues: {
            name: "",
            description: "",
        },
        onSubmit: async ({ value }) => {
            await mutate.mutateAsync(
                {
                    data: {
                        name: value.name,
                        description: value.description,
                    }
                },
                {
                    onSuccess: () => {
                        onOpenChange(false);
                        form.reset();
                    },
                },
            );
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                >
                    <FieldGroup>
                        <form.Field name="name">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Product Name</FieldLabel>
                                    <Input
                                        placeholder="e.g. Dish Wash Liquid"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>

                        <form.Field name="description">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Description</FieldLabel>
                                    <Textarea
                                        placeholder="Optional description..."
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>

                        <Button
                            disabled={form.state.isSubmitting}
                            type="submit"
                            className="w-full"
                        >
                            {form.state.isSubmitting ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                "Add Product"
                            )}
                        </Button>
                    </FieldGroup>
                </form>
            </DialogContent>
        </Dialog>
    );
};
