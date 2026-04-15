import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type ResponsiveSheetProps = {
  title: string;
  description: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  icon?: LucideIcon;
};

export const ResponsiveSheet = ({
  description,
  title,
  children,
  open,
  onOpenChange,
  className,
  icon,
}: ResponsiveSheetProps) => {
  const isMobile = useIsMobile();
  const Icon = icon;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-primary font-semibold">
              {Icon && <Icon className="size-6 text-primary" />}
              {title}
            </DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn("min-w-[600px] overflow-y-auto pb-5", className)}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-primary font-semibold text-lg">
            {Icon && <Icon className="size-6 text-primary" />}
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
};
