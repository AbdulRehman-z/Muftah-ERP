/** biome-ignore-all lint/correctness/noChildrenProp: <explanation> */
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { loginSchema } from "@/lib/validators";
import { FormWrapper } from "../custom/form-wrapper";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "../ui/field";
import {
	PasswordInput,
	PasswordInputStrengthChecker,
} from "../ui/password-input";
import { EmailVerification } from "./email-verification";

export const LoginForm = () => {
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();
	const [showVerificationComponent, setShowVerificationComponent] =
		useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: loginSchema,
		},
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				await authClient.signIn.email(
					{
						email: value.email,
						password: value.password,
					},
					{
						onSuccess: (context) => {
							if (context.data.twoFactorRedirect) {
								navigate({ to: "/2-fa" });
							} else {
								navigate({ to: "/admin/dashboard" });
							}
						},
						onError: (ctx) => {
							if (ctx.error.code === "EMAIL_NOT_VERIFIED") {
								toast.error("Email not verified");
								setShowVerificationComponent(true);
								return;
							}

							toast.error(ctx.error.message || "An unknown error occurred");
						},
					},
				);
			});
		},
	});

	return (
		<FormWrapper>
			{showVerificationComponent ? (
				<EmailVerification email={form.getFieldValue("email")} />
			) : (
				<Card className="border-0 shadow-none">
					<CardHeader className="text-center space-y-2 pb-6">
						<CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
						<CardDescription className="text-sm text-muted-foreground">
							Log in to your Titan Enterprise account
						</CardDescription>
					</CardHeader>
					<CardContent>
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
												<FieldLabel
													className="text-[13px]"
													htmlFor={field.name}
												>
													Email
												</FieldLabel>
												<Input
													className="h-11"
													disabled={isPending}
													id={field.name}
													name={field.name}
													type="email"
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

								<form.Field
									name="password"
									children={(field) => {
										const errors = field.state.meta.errors;
										const isInvalid =
											errors.length > 0 && field.state.meta.isTouched;

										return (
											<Field data-invalid={isInvalid}>
												<div className="flex items-center justify-between mb-1.5">
													<FieldLabel
														className="text-[13px]"
														htmlFor={field.name}
													>
														Password
													</FieldLabel>
													<Link
														className={buttonVariants({
															className:
																"h-auto p-0 text-sm underline hover:text-primary",
															variant: "link",
														})}
														to="/forgot-password"
													>
														Forgot password?
													</Link>
												</div>
												<PasswordInput
													className="h-12!"
													disabled={isPending}
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="••••••••"
												/>
												{isInvalid && <FieldError errors={errors} />}
											</Field>
										);
									}}
								/>

								<Button
									variant="default"
									disabled={isPending}
									type="submit"
									className="w-full h-11 text-base"
								>
									{isPending ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											Logging in...
										</>
									) : (
										"Log in to continue"
									)}
								</Button>

								<FieldDescription className="text-center text-base mt-6">
									Don't have an account?{" "}
									<Link
										to="/sign-up"
										className="font-semibold underline underline-offset-4 hover:text-primary"
									>
										Sign up
									</Link>
								</FieldDescription>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			)}
		</FormWrapper>
	);
};
