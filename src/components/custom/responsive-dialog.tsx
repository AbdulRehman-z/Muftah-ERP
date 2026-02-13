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

type ResponsiveDialogProps = {
	title: string;
	description: string;
	children: ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
};

export const ResponsiveDialog = ({
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={className}>
				<DialogHeader>
					<DialogTitle className="font-semibold">{title}</DialogTitle>
					<DialogDescription className="font-medium">{description}</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
};
