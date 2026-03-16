import { useEffect, useState } from "react";

const EXPIRING_SOON_THRESHOLD_SECONDS = 30 * 60; // 30 minutes

export function useTtlCountdown(expiredAt: string | null) {
	const [ttl, setTtl] = useState<number>(0);

	useEffect(() => {
		if (!expiredAt) return;

		const calculateTtl = () => {
			const now = Date.now();
			const exp = new Date(expiredAt).getTime();
			const diff = Math.floor((exp - now) / 1000);
			return Math.max(0, diff);
		};

		setTtl(calculateTtl());
		const interval = setInterval(() => setTtl(calculateTtl()), 1000);
		return () => clearInterval(interval);
	}, [expiredAt]);

	const isExpiringSoon = ttl > 0 && ttl <= EXPIRING_SOON_THRESHOLD_SECONDS;

	return { ttl, isExpiringSoon };
}
