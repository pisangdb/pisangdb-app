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
} from "#/modules/sandboxes/serverFn";

type CreateSandboxData = z.infer<typeof createSandboxSchema>;
type ExtendSandboxData = z.infer<typeof extendSandboxSchema>;

const SANDBOXES_QUERY_KEY = ["sandboxes"] as const;

export function useSandboxes() {
	return useQuery({
		queryKey: SANDBOXES_QUERY_KEY,
		queryFn: () => $getSandboxes(),
	});
}

export function useSandbox(sandboxId: string) {
	return useQuery({
		queryKey: [...SANDBOXES_QUERY_KEY, sandboxId],
		queryFn: () => $getSandboxById({ data: { sandboxId } }),
		enabled: !!sandboxId,
	});
}

export function useCreateSandbox() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateSandboxData) => $createSandbox({ data: input }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: SANDBOXES_QUERY_KEY });
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
			toast.success("Sandbox deleted");
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete sandbox: ${error.message}`);
		},
	});
}
