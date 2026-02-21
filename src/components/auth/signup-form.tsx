/** biome-ignore-all lint/correctness/noChildrenProp: <explanation> */
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signupSchema } from "@/lib/validators";
import { FormWrapper } from "../custom/form-wrapper";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "../ui/field";
import {
	PasswordInput,
	PasswordInputStrengthChecker,
} from "../ui/password-input";
import { EmailVerification } from "./email-verification";

export const SignupForm = () => {
	// const setAuth = useAuthStore((state) => state.setAuth);
	const [isPending, startTransition] = useTransition();

	const [showVerificationComponent, setShowVerificationComponent] =
		useState(false);
	const form = useForm({
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: signupSchema,
		},
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				await authClient.signUp.email(
					{
						name: value.fullName,
						email: value.email,
						password: value.password,
					},
					{
						onSuccess: () => {
							setShowVerificationComponent(true);
							toast.success("Verification email sent!", {
								description:
									"Please check your mail and click the link to verify your email address.",
							});
						},
						onError: (ctx) => {
							console.log(ctx);
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
				<Card className="border-0 ">
					<CardHeader className="text-center space-y-2 pb-6">
						<CardTitle className="text-2xl font-bold">
							Create your account
						</CardTitle>
						<CardDescription className="text-sm text-accent-foreground">
							Please enter your name, email address and password to create your
							account.
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
									name="fullName"
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
													Full Name
												</FieldLabel>
												<Input
													className="h-11"
													disabled={isPending}
													id={field.name}
													name={field.name}
													type="text"
													autoComplete="name"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="John Doe"
												/>
												{isInvalid && <FieldError errors={errors} />}
											</Field>
										);
									}}
								/>

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
													autoComplete="email"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="john@example.com"
												/>
												<FieldDescription className="text-xs">
													We'll never share your email with anyone else.
												</FieldDescription>
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
												<FieldLabel
													className="text-[13px]"
													htmlFor={field.name}
												>
													Password
												</FieldLabel>
												<PasswordInput
													disabled={isPending}
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="••••••••"
													autoComplete="new-password"
												>
													<PasswordInputStrengthChecker />
												</PasswordInput>
												{isInvalid && <FieldError errors={errors} />}
											</Field>
										);
									}}
								/>

								<form.Field
									name="confirmPassword"
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
													Confirm Password
												</FieldLabel>
												<PasswordInput
													className="h-11"
													disabled={isPending}
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder="••••••••"
													autoComplete="new-password"
												/>
												{isInvalid && <FieldError errors={errors} />}
											</Field>
										);
									}}
								/>

								<Button
									type="submit"
									className="w-full h-11 text-base"
									disabled={isPending}
								>
									{isPending ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											Creating account...
										</>
									) : (
										"Create Account"
									)}
								</Button>

								<FieldDescription className="text-center text-base">
									Already have an account?{" "}
									<Link
										to="/login"
										className="font-semibold underline underline-offset-4 hover:text-primary"
									>
										Log in
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
