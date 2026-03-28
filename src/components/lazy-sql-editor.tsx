import * as React from "react";
import type { SqlEditorProps } from "#/components/sql-editor";

const SqlEditor = React.lazy(async () => {
	const mod = await import("#/components/sql-editor");
	return { default: mod.SqlEditor };
});

export function LazySqlEditor(props: SqlEditorProps) {
	return (
		<React.Suspense
			fallback={
				<div
					className={`overflow-hidden rounded-md border bg-muted/30 ${props.className ?? ""}`}
					style={{ minHeight: "120px" }}
				/>
			}
		>
			<SqlEditor {...props} />
		</React.Suspense>
	);
}
