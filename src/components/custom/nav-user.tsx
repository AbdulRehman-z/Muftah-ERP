import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftFromLine } from "lucide-react";
import { Button } from "../ui/button";

export function NavUser() {
	const navigate = useNavigate();

	return (
		<Button
			variant="secondary"
			className="[&:hover_svg]:motion-preset-wobble [&:hover_svg]:motion-duration-1000"
			onClick={() => {}}
		>
			<ArrowLeftFromLine />
			Sign out
		</Button>
	);
}
