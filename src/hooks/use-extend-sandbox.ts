import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extendSandbox } from "#/lib/api-client";

export function useExtendSandbox(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (hours: number) => extendSandbox(id, hours),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sandbox", id] });
			queryClient.invalidateQueries({ queryKey: ["sandboxes"] });
			toast.success("Sandbox extended!");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
