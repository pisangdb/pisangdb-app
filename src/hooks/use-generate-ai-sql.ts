import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateAiSql } from "#/lib/api-client";

export function useGenerateAiSql(sandboxId: string) {
	return useMutation({
		mutationFn: (prompt: string) => generateAiSql(sandboxId, prompt),
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
