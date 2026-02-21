
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, UserCog, ShieldAlert, Monitor, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role?: string | null;
  banned?: boolean | null;
};


export type UserAction = "update" | "sessions" | "ban" | "delete";

type ActionsProps = {
  user: User;
  onAction: (user: User, action: UserAction) => void;
};

const ActionsCell = ({ user, onAction }: ActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50 transition-all rounded-full">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-muted-foreground/10 ">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
          User Management
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-1 my-1" />

        <DropdownMenuItem
          onClick={() => onAction(user, "update")}
          className="rounded-lg gap-2 cursor-pointer py-2"
        >
          <UserCog className="size-4 text-primary/70" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">Update User</span>
            <span className="text-[10px] text-muted-foreground line-clamp-1">Email, Password & Role</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onAction(user, "sessions")}
          className="rounded-lg gap-2 cursor-pointer py-2"
        >
          <Monitor className="size-4 text-primary/70" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">Manage Sessions</span>
            <span className="text-[10px] text-muted-foreground line-clamp-1">View active logins</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onAction(user, "ban")}
          className="rounded-lg gap-2 cursor-pointer py-2"
        >
          <ShieldAlert className="size-4 text-primary/70" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">{user.banned ? "Unban Account" : "Ban Account"}</span>
            <span className="text-[10px] text-muted-foreground line-clamp-1">Access control</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="-mx-1 my-1" />

        <DropdownMenuItem
          onClick={() => onAction(user, "delete")}
          className="rounded-lg gap-2 cursor-pointer py-2 text-destructive focus:text-destructive focus:bg-destructive/5"
        >
          <Trash2 className="size-4" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">Delete User</span>
            <span className="text-[10px] opacity-70 line-clamp-1">Permanent removal</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns = (
  onAction: (user: User, action: UserAction) => void
): ColumnDef<User>[] => [
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-8 w-8 border border-muted-foreground/5 ">
              <AvatarImage src={user.image || ""} alt={user.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm tracking-tight leading-tight">{user.name}</span>
              <span className="text-[11px] text-muted-foreground/70 font-mono tracking-tight">{user.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role || "user";
        return (
          <div className="flex items-center">
            <Badge
              variant="outline"
              className="capitalize px-2 py-0 h-5 border-muted-foreground/10 bg-muted/5 font-medium text-[10px] text-muted-foreground tracking-tight"
            >
              {role}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isBanned = row.original.banned;
        return (
          <div className="flex items-center gap-1.5">
            <div className={`size-1.5 rounded-full ${isBanned ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"}`} />
            <span className={`text-[11px] font-medium uppercase tracking-wider ${isBanned ? "text-destructive/80" : "text-emerald-600/80"}`}>
              {isBanned ? "Banned" : "Active"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground/60 text-[11px] font-mono">
            {format(new Date(row.original.createdAt), "dd/MM/yy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ActionsCell user={row.original} onAction={onAction} />
        </div>
      ),
    },
  ];
