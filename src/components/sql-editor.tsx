import { defaultKeymap } from "@codemirror/commands";
import { MySQL, PostgreSQL, sql } from "@codemirror/lang-sql";
import {
	defaultHighlightStyle,
	syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
	EditorView,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	placeholder,
} from "@codemirror/view";
import { useEffect, useRef } from "react";

export type SqlEditorProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	engine?: "postgresql" | "mysql" | "mariadb";
};

const defaultTheme = EditorView.theme({
	"&": {
		height: "100%",
		fontSize: "14px",
	},
	".cm-content": {
		fontFamily: "var(--font-mono)",
		padding: "8px 0",
	},
	".cm-line": {
		padding: "0 8px",
	},
	".cm-gutters": {
		backgroundColor: "var(--muted)",
		color: "var(--muted-foreground)",
		border: "none",
	},
	".cm-activeLineGutter": {
		backgroundColor: "var(--accent)",
	},
	"&.cm-focused .cm-cursor": {
		borderLeftColor: "var(--foreground)",
	},
	"&.cm-focused .cm-selectionBackground, ::selection": {
		backgroundColor: "var(--accent)",
	},
});

export function SqlEditor({
	value,
	onChange,
	placeholder: placeholderText = "Enter your SQL query here...",
	disabled = false,
	className = "",
	engine = "postgresql",
}: SqlEditorProps) {
	const editorRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!editorRef.current) return;

		const dialect =
			engine === "mysql" || engine === "mariadb" ? MySQL : PostgreSQL;

		const state = EditorState.create({
			doc: value,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				sql({ dialect }),
				syntaxHighlighting(defaultHighlightStyle),
				defaultTheme,
				keymap.of(defaultKeymap),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						onChangeRef.current(newValue);
					}
				}),
				EditorView.editable.of(!disabled),
				EditorState.readOnly.of(disabled),
				placeholder(placeholderText),
			],
		});

		const view = new EditorView({
			state,
			parent: editorRef.current,
		});

		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
		};
	}, [engine, disabled, placeholderText, value]);

	return (
		<div
			ref={editorRef}
			className={`overflow-hidden rounded-md border bg-muted/30 ${className}`}
			style={{ minHeight: "120px" }}
		/>
	);
}
