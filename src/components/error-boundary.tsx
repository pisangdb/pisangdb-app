import { AlertTriangleIcon } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: unknown) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const isAuthError =
				this.state.error?.message?.toLowerCase().includes("unauthorized") ||
				this.state.error?.message
					?.toLowerCase()
					.includes("not authenticated") ||
				this.state.error?.message?.toLowerCase().includes("auth");

			return (
				<Card className="m-4">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<AlertTriangleIcon className="size-4 text-destructive" />
							Something went wrong
						</CardTitle>
						<CardDescription>
							{isAuthError
								? "Your session may have expired. Try logging in again."
								: "An unexpected error occurred. Your data is safe."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="mb-4 text-sm text-muted-foreground">
							{this.state.error?.message ?? "Unknown error"}
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={
								isAuthError
									? () => {
											window.location.href = "/login";
										}
									: this.handleReset
							}
						>
							{isAuthError ? "Log in again" : "Try again"}
						</Button>
					</CardContent>
				</Card>
			);
		}

		return this.props.children;
	}
}
