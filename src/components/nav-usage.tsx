import { Link } from "@tanstack/react-router";
import { DatabaseIcon, PlusIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import { SidebarGroup, SidebarGroupContent } from "#/components/ui/sidebar";

const MAX_SANDBOXES = 5;

export function NavUsage({ active = 0 }: { active?: number }) {
	const percentage = (active / MAX_SANDBOXES) * 100;

	const progressColor =
		percentage >= 80
			? "bg-red-500"
			: percentage >= 60
				? "bg-yellow-500"
				: "bg-emerald-500";

	return (
		<SidebarGroup className="mt-auto">
			<SidebarGroupContent>
				<div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<div className="flex size-6 items-center justify-center rounded-md bg-sidebar-primary/10 text-sidebar-primary">
							<DatabaseIcon className="size-3.5" />
						</div>
						<span className="text-xs font-medium text-sidebar-foreground">
							Sandbox Usage
						</span>
						<span className="ml-auto text-xs text-sidebar-foreground/50">
							{active}/{MAX_SANDBOXES}
						</span>
					</div>
					<Progress
						value={percentage}
						className="h-1.5 bg-sidebar-border"
						indicatorClassName={progressColor}
					/>
					<Button
						asChild
						size="sm"
						variant="outline"
						className="h-7 w-full gap-1.5 text-xs border-sidebar-border bg-sidebar-background hover:bg-sidebar-accent"
					>
						<Link to="/dashboard/sandboxes/new">
							<PlusIcon className="size-3" />
							New Sandbox
						</Link>
					</Button>
				</div>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
