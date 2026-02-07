import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "../ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";

type ResponsiveDialogProps = {
	title: string;
	description: string;
	children: ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export const ResponsiveSheet = ({
	description,
	title,
	children,
	open,
	onOpenChange,
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
			<SheetContent className="min-w-lg overflow-y-auto pb-5">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<div className="px-4">{children}</div>
			</SheetContent>
		</Sheet>
	);
};
