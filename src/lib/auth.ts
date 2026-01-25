import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { account, db, session, user, verification } from "../db";
import { resetPasswordTemplate } from "../email-templates/reset-password-template";
import { verificationEmailTemplate } from "../email-templates/verify-email-template";
import { sendEmail } from "./email-client";
import { ac, admin, operator, superAdmin } from "./permissions";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg", // or "mysql"
		schema: {
			session,
			account,
			verification,
			twoFactor,
			user,
		},
	}),
	// emailVerification: {
	// 	autoSignInAfterVerification: true,
	// 	sendOnSignIn: true,
	// 	sendOnSignUp: true,
	// 	sendVerificationEmail: async ({ url, user }) => {
	// 		await sendEmail({
	// 			email: user.email,
	// 			html: () =>
	// 				verificationEmailTemplate({
	// 					url,
	// 					user,
	// 				}),
	// 			subject: "Verify Your Email",
	// 		});
	// 	},
	// },
	emailAndPassword: {
		autoSignIn: true,
		requireEmailVerification: false,
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				email: user.email,
				html: () =>
					resetPasswordTemplate({
						url,
						user,
					}),
				subject: "Reset Password Request",
			});
		},
	},

	plugins: [
		twoFactor(),
		adminPlugin({
			defaultRole: "super-admin",
			adminRoles: ["super-admin", "admin", "operator"],
			ac,
			roles: {
				operator: operator,
				"super-admin": superAdmin,
				admin: admin,
			},
		}),
	],
});
