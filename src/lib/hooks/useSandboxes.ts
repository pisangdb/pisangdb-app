import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";
import type {
	createSandboxSchema,
	extendSandboxSchema,
} from "#/modules/sandboxes/schema";
import {
	$createSandbox,
	$deleteSandbox,
	$extendSandbox,
	$getSandboxById,
	$getSandboxes,
	$getSandboxStorageOverview,
} from "#/modules/sandboxes/serverFn";

type CreateSandboxData = z.infer<typeof createSandboxSchema>;
type ExtendSandboxData = z.infer<typeof extendSandboxSchema>;

const SANDBOXES_QUERY_KEY = ["sandboxes"] as const;
const SANDBOX_STORAGE_OVERVIEW_QUERY_KEY = [
	"sandboxes-storage-overview",
] as const;
const DASHBOARD_STATS_QUERY_KEY = ["dashboard-stats"] as const;

export function useSandboxes() {
	return useQuery({
		queryKey: SANDBOXES_QUERY_KEY,
		queryFn: () => $getSandboxes(),
		refetchInterval: 30_000,
		staleTime: 0,
	});
}

export function useSandbox(sandboxId: string) {
	return useQuery({
		queryKey: [...SANDBOXES_QUERY_KEY, sandboxId],
		queryFn: () => $getSandboxById({ data: { sandboxId } }),
		enabled: !!sandboxId,
	});
}

export function useSandboxStorageOverview() {
	return useQuery({
		queryKey: SANDBOX_STORAGE_OVERVIEW_QUERY_KEY,
		queryFn: () => $getSandboxStorageOverview(),
		refetchInterval: 30_000,
		staleTime: 0,
	});
}

export function useCreateSandbox() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateSandboxData) => $createSandbox({ data: input }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: SANDBOXES_QUERY_KEY });
			void queryClient.invalidateQueries({
				queryKey: SANDBOX_STORAGE_OVERVIEW_QUERY_KEY,
			});
			void queryClient.invalidateQueries({
				queryKey: DASHBOARD_STATS_QUERY_KEY,
			});
			toast.success("Sandbox created successfully");
		},
		onError: (error: Error) => {
			toast.error(`Failed to create sandbox: ${error.message}`);
		},
	});
}

export function useExtendSandbox() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: ExtendSandboxData) => $extendSandbox({ data: input }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: SANDBOXES_QUERY_KEY });
			void queryClient.invalidateQueries({
				queryKey: SANDBOX_STORAGE_OVERVIEW_QUERY_KEY,
			});
			void queryClient.invalidateQueries({
				queryKey: DASHBOARD_STATS_QUERY_KEY,
			});
			toast.success("Sandbox extended successfully");
		},
		onError: (error: Error) => {
			toast.error(`Failed to extend sandbox: ${error.message}`);
		},
	});
}

export function useDeleteSandbox() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (sandboxId: string) => $deleteSandbox({ data: { sandboxId } }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: SANDBOXES_QUERY_KEY });
			void queryClient.invalidateQueries({
				queryKey: SANDBOX_STORAGE_OVERVIEW_QUERY_KEY,
			});
			void queryClient.invalidateQueries({
				queryKey: DASHBOARD_STATS_QUERY_KEY,
			});
			toast.success("Sandbox deleted");
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete sandbox: ${error.message}`);
		},
	});
}
