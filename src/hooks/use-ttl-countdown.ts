import { useEffect, useState } from "react";

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

	return ttl;
}
