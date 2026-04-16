import { createTransport } from "nodemailer";

const SMTP_FROM =
  process.env.SMTP_FROM?.trim() || "Muftah Chemical PVT LTD (S-WASH)";

const hasSmtpCredentials =
  Boolean(process.env.SMTP_USER) && Boolean(process.env.SMTP_PASS);

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: hasSmtpCredentials
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  greetingTimeout: 10000,
  socketTimeout: 30000,
});

let hasAttemptedSmtpVerification = false;

export async function verifySmtpConnection() {
  if (hasAttemptedSmtpVerification) {
    return;
  }
  hasAttemptedSmtpVerification = true;

  if (!process.env.SMTP_HOST || !hasSmtpCredentials) {
    console.warn(
      "SMTP not fully configured. Email delivery will fail until SMTP env vars are set.",
    );
    return;
  }

  try {
    await transporter.verify();
    console.log("SMTP connection verified");
  } catch (error) {
    console.error("SMTP connection failed:", error);
  }
}

export const sendEmail = async ({
  email,
  subject,
  html,
}: {
  email: string;
  subject: string;
  html: string | (() => string);
}) => {
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: subject,
      html: typeof html === "function" ? html() : html,
    });

    // return info;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Email failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while sending email");
  }
};
