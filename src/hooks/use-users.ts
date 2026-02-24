import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { superAdminGetUserSessionsFn } from "@/server-functions/user-management/super-admin-get-user-sessions-fn";

export const useUsers = () => {
  const queryClient = useQueryClient();

  const listUsers = (queryParams: any) => {
    return useQuery({
      queryKey: ["users", queryParams],
      queryFn: async () => {
        const { data, error } = await authClient.admin.listUsers({
          query: queryParams,
        });
        if (error) throw new Error(error.message);
        return data;
      },
      placeholderData: (previousData) => previousData,
    });
  };

  const listUserSessions = (userId: string, enabled: boolean) => {
    return useQuery({
      queryKey: ["user-sessions", userId],
      queryFn: async () => {
        const result = await superAdminGetUserSessionsFn({ data: { userId } });
        return result.sessions;
      },
      enabled,
    });
  };

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await authClient.admin.createUser(data);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const setRole = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "super-admin" | "operator" | "finance-manager";
    }) => {
      const { error } = await authClient.admin.setRole({ userId, role });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("User role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUser = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const { error } = await authClient.admin.updateUser({ userId, data });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const setUserPassword = useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string;
      password: string;
    }) => {
      const { error } = await authClient.admin.setUserPassword({
        userId,
        newPassword: password,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const banUser = useMutation({
    mutationFn: async ({
      userId,
      reason,
      duration,
    }: {
      userId: string;
      reason?: string;
      duration?: number;
    }) => {
      const { error } = await authClient.admin.banUser({
        userId,
        banReason: reason,
        banExpiresIn: duration,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("User banned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const unbanUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await authClient.admin.unbanUser({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("User unbanned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await authClient.admin.removeUser({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeUserSession = useMutation({
    mutationFn: async ({ sessionToken }: { sessionToken: string }) => {
      const { error } = await authClient.admin.revokeUserSession({
        sessionToken,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Session revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeAllUserSessions = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await authClient.admin.revokeUserSessions({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("All sessions revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const impersonateUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await authClient.admin.impersonateUser({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err) => toast.error(err.message),
  });

  return {
    listUsers,
    listUserSessions,
    createUser,
    setRole,
    updateUser,
    setUserPassword,
    banUser,
    unbanUser,
    removeUser,
    revokeUserSession,
    revokeAllUserSessions,
    impersonateUser,
  };
};
