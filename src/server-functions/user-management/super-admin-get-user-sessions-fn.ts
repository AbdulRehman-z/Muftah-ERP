import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import {
    requireAuthMiddleware,
    requireSuperAdminMiddleware,
} from "@/lib/middlewares";
import { z } from "zod";

const userIdSchema = z.object({
    userId: z.string(),
});

export const superAdminGetUserSessionsFn = createServerFn()
    .middleware([requireAuthMiddleware, requireSuperAdminMiddleware])
    .inputValidator(userIdSchema)
    .handler(async ({ data }) => {
        return await auth.api.listUserSessions({
            headers: getRequestHeaders(),
            body: {
                userId: data.userId
            },
        });
    });
