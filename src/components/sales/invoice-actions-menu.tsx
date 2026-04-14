import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Printer,
  Trash2,
  MoreVertical,
} from "lucide-react";

interface Props {
  onView: () => void;
  onPrint: () => void;
  onDelete: () => void;
}

export const InvoiceActionsMenu = ({ onView, onPrint, onDelete }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 p-0 hover:bg-muted/50">
          <MoreVertical className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView} className="gap-2">
          <Eye className="size-3.5" />
          View Detail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint} className="gap-2">
          <Printer className="size-3.5" />
          Print Invoice
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
