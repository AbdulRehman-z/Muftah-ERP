import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { AddUserForm } from "./add-user-form";
import { UserPlus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AddUserDialog = ({ open, onOpenChange }: Props) => {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New User"
      description="Create a new user account with specific permissions."
      className="sm:max-w-md"
      icon={UserPlus}
    >
      <AddUserForm onSuccess={() => onOpenChange(false)} />
    </ResponsiveDialog>
  );
};
