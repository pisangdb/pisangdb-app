type PendingBlockProps = {
	className: string;
};

export function PendingBlock({ className }: PendingBlockProps) {
	return (
		<div
			aria-hidden="true"
			className={`animate-pulse rounded-md bg-muted ${className}`}
		/>
	);
}
