import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEmployeeFn } from "@/server-functions/hr/employees/delete-employee-fn";
import { toast } from "sonner";

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployeeFn,
    onSuccess: () => {
      toast.success("Employee deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete employee");
    },
  });
};
