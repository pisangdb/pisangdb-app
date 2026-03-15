import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { deleteSandbox } from "#/lib/api-client";

export function useDeleteSandbox() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: deleteSandbox,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sandboxes"] });
			router.navigate({ to: "/dashboard/sandboxes" });
			toast.success("Sandbox deleted!");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
