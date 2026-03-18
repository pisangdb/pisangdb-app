import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { SandboxStatus } from "#/lib/types";
import { Badge } from "./ui/badge";

interface TtlCountdownProps {
	expiredAt: Date | string;
	status?: SandboxStatus;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

function parseExpiredAt(expiredAt: Date | string): number {
	const date = expiredAt instanceof Date ? expiredAt : new Date(expiredAt);
	return date.getTime();
}

function formatCountdown(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
	}

	return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function TtlCountdown({
	expiredAt,
	status = "active",
}: TtlCountdownProps) {
	const expiredMs = parseExpiredAt(expiredAt);
	const [remainingMs, setRemainingMs] = useState(() => {
		const now = Date.now();
		return Math.max(0, expiredMs - now);
	});

	useEffect(() => {
		const tick = () => {
			const now = Date.now();
			setRemainingMs(Math.max(0, expiredMs - now));
		};

		tick();
		const interval = setInterval(tick, MS_PER_SECOND);

		return () => clearInterval(interval);
	}, [expiredMs]);

	if (status === "expired" || remainingMs <= 0) {
		return (
			<Badge variant="destructive" className="gap-1">
				<XCircle className="size-3" />
				Expired
			</Badge>
		);
	}

	if (remainingMs < 30 * MS_PER_MINUTE) {
		return (
			<Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-1">
				<AlertTriangle className="size-3" />
				{formatCountdown(remainingMs)}
			</Badge>
		);
	}

	return (
		<Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 gap-1">
			<CheckCircle className="size-3" />
			{formatCountdown(remainingMs)}
		</Badge>
	);
}
