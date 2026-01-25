/** biome-ignore-all lint/correctness/noChildrenProp: <explanation> */
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/validators";
import { FormWrapper } from "../custom/form-wrapper";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "../ui/field";

export const ForgotPasswordForm = () => {
	const [isSent, setIsSent] = useState(false);
	const [isPending, startTransition] = useTransition();

	const form = useForm({
		defaultValues: {
			email: "",
		},
		validators: {
			onSubmit: forgotPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				await authClient.requestPasswordReset(
					{
						email: value.email,
						redirectTo: `http://localhost:3000/reset-password`,
					},
					{
						onSuccess: () => {
							setIsSent(true);
							toast.success("Password reset email sent");
						},
						onError: (ctx) => {
							toast.error(ctx.error.message || "Something went wrong");
						},
					},
				);
			});
		},
	});

	const isSubmitting = form.state.isSubmitting;

	return (
		<FormWrapper>
			<Card className="border-0 shadow-none">
				<CardHeader className="text-center space-y-2 pb-6">
					<CardTitle className="text-2xl font-semibold">
						{isSent ? "Check your email" : "Forgot password?"}
					</CardTitle>
					<CardDescription className="text-base">
						{isSent
							? "We've sent a password reset link to your email address."
							: "Enter your email and we'll send you a link to reset your password."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!isSent ? (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
						>
							<FieldGroup className="space-y-4">
								<form.Field
									name="email"
									children={(field) => {
										const errors = field.state.meta.errors;
										const isInvalid =
											errors.length > 0 && field.state.meta.isTouched;

										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>Email</FieldLabel>
												<Input
													disabled={isSubmitting}
													id={field.name}
													name={field.name}
													type="email"
													autoComplete="email"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="Enter your email"
												/>
												{isInvalid && <FieldError errors={errors} />}
											</Field>
										);
									}}
								/>

								<Button
									disabled={isSubmitting}
									type="submit"
									className="w-full mt-6"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											Sending link...
										</>
									) : (
										"Send Reset Link"
									)}
								</Button>

								<FieldDescription className="text-center mt-6">
									Remember your password?{" "}
									<Link
										className="font-semibold underline underline-offset-4 hover:text-primary"
										to="/login"
									>
										Log in
									</Link>
								</FieldDescription>
							</FieldGroup>
						</form>
					) : (
						<div className="space-y-4">
							<Link
								className={buttonVariants({
									variant: "default",
									className: "w-full",
								})}
								to="/login"
							>
								Back to Log In
							</Link>
							<FieldDescription className="text-center text-xs">
								Didn't receive an email? Check your spam folder or{" "}
								<button
									type="button"
									onClick={() => setIsSent(false)}
									className="font-semibold underline underline-offset-4 hover:text-primary"
								>
									try again
								</button>
							</FieldDescription>
						</div>
					)}
				</CardContent>
			</Card>
		</FormWrapper>
	);
};
