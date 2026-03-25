import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";
import type {
	changePasswordSchema,
	deleteAccountSchema,
	updatePreferencesSchema,
	updateProfileSchema,
} from "#/modules/auth/schema";
import {
	$changePassword,
	$deleteAccount,
	$getUserPreferences,
	$getUserSettings,
	$getWorkspaceStats,
	$listSessions,
	$revokeAllSessions,
	$revokeSession,
	$updateProfile,
	$updateUserPreferences,
} from "#/modules/auth/serverFn";

type UpdateProfileData = z.infer<typeof updateProfileSchema>;
type ChangePasswordData = z.infer<typeof changePasswordSchema>;
type DeleteAccountData = z.infer<typeof deleteAccountSchema>;
type UpdatePreferencesData = z.infer<typeof updatePreferencesSchema>;

const USER_SETTINGS_QUERY_KEY = ["user-settings"] as const;
const USER_SESSIONS_QUERY_KEY = ["user-sessions"] as const;
const USER_PREFERENCES_QUERY_KEY = ["user-preferences"] as const;
const WORKSPACE_STATS_QUERY_KEY = ["workspace-stats"] as const;

// ─── User Settings ────────────────────────────────────────────────────────────

export function useUserSettings() {
	return useQuery({
		queryKey: USER_SETTINGS_QUERY_KEY,
		queryFn: () => $getUserSettings(),
	});
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateProfileData) => $updateProfile({ data: input }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
			toast.success("Profile updated successfully");
		},
		onError: (error: Error) => {
			toast.error(`Failed to update profile: ${error.message}`);
		},
	});
}

// ─── Password ──────────────────────────────────────────────────────────────────

export function useChangePassword() {
	return useMutation({
		mutationFn: (input: ChangePasswordData) => $changePassword({ data: input }),
		onSuccess: () => {
			toast.success("Password changed successfully");
		},
		onError: (error: Error) => {
			toast.error(`Failed to change password: ${error.message}`);
		},
	});
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export function useSessions() {
	return useQuery({
		queryKey: USER_SESSIONS_QUERY_KEY,
		queryFn: () => $listSessions(),
	});
}

export function useRevokeSession() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (token: string) => $revokeSession({ data: { token } }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: USER_SESSIONS_QUERY_KEY,
			});
			toast.success("Session revoked");
		},
		onError: (error: Error) => {
			toast.error(`Failed to revoke session: ${error.message}`);
		},
	});
}

export function useRevokeAllSessions() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => $revokeAllSessions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: USER_SESSIONS_QUERY_KEY,
			});
			toast.success("All other sessions have been signed out");
		},
		onError: (error: Error) => {
			toast.error(`Failed to revoke sessions: ${error.message}`);
		},
	});
}

// ─── Preferences ───────────────────────────────────────────────────────────────

export function usePreferences() {
	return useQuery({
		queryKey: USER_PREFERENCES_QUERY_KEY,
		queryFn: () => $getUserPreferences(),
	});
}

export function useWorkspaceStats() {
	return useQuery({
		queryKey: WORKSPACE_STATS_QUERY_KEY,
		queryFn: () => $getWorkspaceStats(),
		refetchInterval: 30_000,
	});
}

export function useUpdatePreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdatePreferencesData) =>
			$updateUserPreferences({ data: input }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: USER_PREFERENCES_QUERY_KEY,
			});
			toast.success("Preferences saved");
		},
		onError: (error: Error) => {
			toast.error(`Failed to update preferences: ${error.message}`);
		},
	});
}

// ─── Account Deletion ──────────────────────────────────────────────────────────

export function useDeleteAccount() {
	return useMutation({
		mutationFn: (input: DeleteAccountData) => $deleteAccount({ data: input }),
		onSuccess: () => {
			toast.success("Account deleted successfully");
			// Redirect to home page after deletion
			window.location.href = "/";
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete account: ${error.message}`);
		},
	});
}
