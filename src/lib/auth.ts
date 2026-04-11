import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { twoFactor } from "better-auth/plugins/two-factor";
import { account, db, session, user, verification } from "../db";
import { resetPasswordTemplate } from "../email-templates/reset-password-template";
import { verificationEmailTemplate } from "../email-templates/verify-email-template";
import { sendEmail } from "./email-client";
import { getAuthBaseUrl } from "./auth-url";
import { ac, admin, financeManager, operator, superAdmin } from "./permissions";

const authBaseUrl = getAuthBaseUrl();
const trustedOrigins = authBaseUrl ? [authBaseUrl] : [];

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
  emailVerification: {
    // autoSignInAfterVerification: true,
    // sendOnSignIn: true,
    // sendOnSignUp: true,
    // sendVerificationEmail: async ({ url, user }) => {
    //   await sendEmail({
    //     email: user.email,
    //     html: () =>
    //       verificationEmailTemplate({
    //         url,
    //         user,
    //       }),
    //     subject: "Verify Your Email",
    //   });
    // },
  },
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
  trustedOrigins,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  plugins: [
    twoFactor(),
    adminPlugin({
      defaultRole: "operator",
      adminRoles: ["super-admin", "admin"],
      ac,
      roles: {
        operator: operator,
        "super-admin": superAdmin,
        admin: admin,
        "finance-manager": financeManager,
      },
    }),
  ],
});
