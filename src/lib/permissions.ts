import { createAccessControl } from "better-auth/plugins/access";

const statement = {
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"delete",
		"set-password",
	],
	session: ["list", "revoke", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const superAdmin = ac.newRole({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"delete",
		"set-password",
	],
	session: ["list", "revoke", "delete"],
});

export const admin = ac.newRole({
	user: ["list", "ban"],
	session: ["list"],
});

export const operator = ac.newRole({
	user: [],
	session: [],
});
