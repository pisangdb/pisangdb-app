import { BananaIcon } from "lucide-react";
import { cn } from "#/lib/utils";

interface LogoProps {
	size?: "sm" | "md" | "lg";
	showText?: boolean;
	className?: string;
}

const sizeMap = {
	sm: {
		wrapper: "size-7",
		icon: "size-4",
		text: "text-base",
	},
	md: {
		wrapper: "size-9",
		icon: "size-5",
		text: "text-lg",
	},
	lg: {
		wrapper: "size-12",
		icon: "size-7",
		text: "text-2xl",
	},
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
	const s = sizeMap[size];

	return (
		<div className={cn("flex items-center gap-2.5", className)}>
			<div
				className={cn(
					"relative flex shrink-0 items-center justify-center rounded-xl",
					"bg-primary text-primary-foreground shadow-sm",
					"ring-2 ring-primary/20",
					s.wrapper,
				)}
			>
				<BananaIcon className={cn(s.icon)} />
				{/* accent dot */}
				<span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-1 ring-background" />
			</div>
			{showText && (
				<span
					className={cn("font-semibold tracking-tight text-foreground", s.text)}
				>
					Pisang<span className="text-primary">DB</span>
				</span>
			)}
		</div>
	);
}
