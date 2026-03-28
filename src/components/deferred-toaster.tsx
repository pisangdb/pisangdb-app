import * as React from "react";

const SonnerToaster = React.lazy(async () => {
	const module = await import("sonner");
	return { default: module.Toaster };
});

export function DeferredToaster() {
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			React.startTransition(() => {
				setMounted(true);
			});
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, []);

	if (!mounted) return null;

	return (
		<React.Suspense fallback={null}>
			<SonnerToaster richColors closeButton />
		</React.Suspense>
	);
}
