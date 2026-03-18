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
	onSubmit?: () => void;
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
		caretColor: "var(--primary)",
	},
	".cm-cursor": {
		borderLeft: "2px solid var(--primary)",
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
	"&.cm-focused .cm-selectionBackground, ::selection": {
		backgroundColor: "var(--accent)",
	},
});

export function SqlEditor({
	value,
	onChange,
	onSubmit,
	placeholder: placeholderText = "Enter your SQL query here...",
	disabled = false,
	className = "",
	engine = "postgresql",
}: SqlEditorProps) {
	const editorRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const onSubmitRef = useRef(onSubmit);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: editor must not re-mount on keystrokes; controlled via React key prop
	useEffect(() => {
		if (!editorRef.current) return;

		const dialect =
			engine === "mysql" || engine === "mariadb" ? MySQL : PostgreSQL;

		const submitKeymap = [
			{
				key: "Mod-Enter",
				run: () => {
					onSubmitRef.current?.();
					return true;
				},
			},
		];

		const state = EditorState.create({
			doc: value,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				sql({ dialect }),
				syntaxHighlighting(defaultHighlightStyle),
				defaultTheme,
				keymap.of([...defaultKeymap, ...submitKeymap]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						onChangeRef.current(newValue);
					}
				}),
				EditorView.editable.of(!disabled),
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
	}, [engine]);

	return (
		<div
			ref={editorRef}
			className={`overflow-hidden rounded-md border bg-muted/30 ${className}`}
			style={{ minHeight: "120px" }}
		/>
	);
}
