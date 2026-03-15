import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { createSandbox } from "#/lib/api-client";

export function useCreateSandbox() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: createSandbox,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["sandboxes"] });
			router.navigate({
				to: "/dashboard/sandboxes/$id",
				params: { id: data.sandbox.id },
			});
			toast.success("Sandbox created!");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
