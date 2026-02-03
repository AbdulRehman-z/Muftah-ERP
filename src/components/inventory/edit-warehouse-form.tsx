import { useForm } from "@tanstack/react-form";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateWarehouse } from "@/hooks/inventory/use-update-warehouse";
import { updateWarehouseSchema } from "@/lib/validators";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type Props = {
    warehouse: {
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        latitude: string | number;
        longitude: string | number;
    };
    onSuccess: () => void;
};

export const EditWarehouseForm = ({ warehouse, onSuccess }: Props) => {
    const mutate = useUpdateWarehouse();

    const form = useForm({
        defaultValues: {
            id: warehouse.id,
            name: warehouse.name,
            address: warehouse.address,
            city: warehouse.city,
            state: warehouse.state,
            latitude: warehouse.latitude.toString(),
            longitude: warehouse.longitude.toString(),
        },
        validators: {
            onSubmit: updateWarehouseSchema,
        },
        onSubmit: async ({ value }) => {
            await mutate.mutateAsync(
                { data: value },
                {
                    onSuccess: onSuccess,
                },
            );
        },
    });

    const handleGetLocation = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            form.setFieldValue("latitude", pos.coords.latitude.toString());
            form.setFieldValue("longitude", pos.coords.longitude.toString());
        });
    };

    return (
        <form
            className="space-y-4 max-w-md"
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
                            <FieldLabel>Warehouse Name</FieldLabel>
                            <Input
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Field name="address">
                    {(field) => (
                        <Field>
                            <FieldLabel>Address</FieldLabel>
                            <Input
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                    <form.Field name="city">
                        {(field) => (
                            <Field>
                                <FieldLabel>City</FieldLabel>
                                <Input
                                    placeholder="e.g. Karachi"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="state">
                        {(field) => (
                            <Field>
                                <FieldLabel>State / Province</FieldLabel>
                                <Input
                                    placeholder="e.g. Sindh"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <form.Field name="latitude">
                        {(field) => (
                            <Field>
                                <FieldLabel>Latitude</FieldLabel>
                                <Input
                                    placeholder="e.g. 40.7128"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="longitude">
                        {(field) => (
                            <Field>
                                <FieldLabel>Longitude</FieldLabel>
                                <Input
                                    placeholder="e.g. -74.0060"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetLocation}
                    className="w-fit"
                >
                    <MapPin className="mr-2 size-4" /> Use Current Location
                </Button>

                <Button
                    disabled={form.state.isSubmitting}
                    type="submit"
                    className="w-full"
                >
                    {form.state.isSubmitting ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                        "Update Warehouse"
                    )}
                </Button>
            </FieldGroup>
        </form>
    );
};
