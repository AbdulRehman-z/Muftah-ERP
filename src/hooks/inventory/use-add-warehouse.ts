import { useMutation } from "@tanstack/react-query";
import { addWarehouseFn } from "@/server-functions/inventory/add-warehouse.fn";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const useAddWarehouse = () => {
 const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addWarehouseFn,
    mutationKey: ["inventory"],
    onSuccess: () => {
      toast.success("Warehouse added successfully");
      queryClient.invalidateQueries({queryKey: ["inventory"]});
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add warehouse");
    },
  })
}
