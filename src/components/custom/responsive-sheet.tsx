import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "../ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { cn } from "@/lib/utils";

type ResponsiveDialogProps = {
	title: string;
	description: string;
	children: ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
};

export const ResponsiveSheet = ({
	description,
	title,
	children,
	open,
	onOpenChange,
	className,
}: ResponsiveDialogProps) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerDescription>{description}</DrawerDescription>
					</DrawerHeader>
					<div className="p-4">{children}</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className={cn("min-w-[600px] overflow-y-auto pb-5", className)}>
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<div className="px-5">{children}</div>
			</SheetContent>
		</Sheet>
	);
};
