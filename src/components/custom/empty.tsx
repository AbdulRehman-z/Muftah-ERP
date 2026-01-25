import { type LucideIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

type Props = {
	icon: LucideIcon;
	title: string;
	description: string;
	ctaText: string;
	onAddChange: (open: boolean) => void;
};

export function GenericEmpty({
	icon: Icon,
	title,
	description,
	ctaText,
	onAddChange,
}: Props) {
	return (
		<Empty>
			<EmptyHeader className="space-y-2">
				<EmptyMedia variant="default">
					<Icon className="size-10" />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="flex-row justify-center gap-5">
				<Button onClick={() => onAddChange(true)}>
					<PlusIcon />
					{ctaText}
				</Button>
			</EmptyContent>
		</Empty>
	);
}
