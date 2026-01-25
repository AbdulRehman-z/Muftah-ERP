import { createTransport } from "nodemailer";

const transporter = createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT) || 587,
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

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
			from: "Titan Enterprise",
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
