import { MailSearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "../ui/empty";

type Props = {
	email: string;
};

export const EmailVerification = ({ email }: Props) => {
	const [timeToNextResend, setTimeToNextResend] = useState(30);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const startResendVerificationTimer = (time = 30) => {
		// Clear any existing interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		setTimeToNextResend(time);

		intervalRef.current = setInterval(() => {
			setTimeToNextResend((t) => {
				const newT = t - 1;

				if (newT <= 0) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
					return 0;
				}
				return newT;
			});
		}, 1000);
	};

	const handleResendEmail = async () => {
		try {
			startResendVerificationTimer();

			await authClient.sendVerificationEmail({
				email: email,
				callbackURL: window.location.origin,
			});

			toast.success("Verification email sent!", {
				description: "Please check your inbox.",
			});
		} catch (error) {
			toast.error("Failed to resend verification email");
			// Reset timer on error
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			setTimeToNextResend(0);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		startResendVerificationTimer();

		// Cleanup interval on unmount
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	return (
		<Empty className="py-12">
			<EmptyMedia className="mb-4">
				<MailSearchIcon className="size-12 text-muted-foreground" />
			</EmptyMedia>
			<EmptyHeader className="space-y-2">
				<EmptyTitle className="text-2xl">Verify your email</EmptyTitle>
				<EmptyDescription className="text-base max-w-md mx-auto">
					We've sent a verification link to{" "}
					<span className="font-semibold text-foreground">{email}</span>. Please
					check your inbox and click the link to verify your account.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="mt-6 space-y-4">
				<Button
					onClick={handleResendEmail}
					disabled={timeToNextResend !== 0}
					variant={timeToNextResend === 0 ? "default" : "secondary"}
					className="min-w-[200px]"
				>
					{timeToNextResend === 0
						? "Resend Email"
						: `Resend in ${timeToNextResend}s`}
				</Button>
				<p className="text-xs text-muted-foreground">
					Didn't receive the email? Check your spam folder.
				</p>
			</EmptyContent>
		</Empty>
	);
};
