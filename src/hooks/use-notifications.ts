import { useQuery } from "@tanstack/react-query";
import { getNotifications, type Notification } from "#/lib/api-client";

export function useNotifications() {
	return useQuery<Notification[]>({
		queryKey: ["notifications"],
		queryFn: () => getNotifications(),
		refetchInterval: 30000,
	});
}
