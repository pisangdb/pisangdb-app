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
	const valueRef = useRef(value);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);

	useEffect(() => {
		valueRef.current = value;
	}, [value]);

	useEffect(() => {
		if (!viewRef.current) return;
		const currentValue = viewRef.current.state.doc.toString();
		if (value !== currentValue) {
			viewRef.current.dispatch({
				changes: {
					from: 0,
					to: currentValue.length,
					insert: value,
				},
			});
		}
	}, [value]);

	useEffect(() => {
		if (!editorRef.current) return;

		const dialect =
			engine === "mysql" || engine === "mariadb" ? MySQL : PostgreSQL;

		const submitKeyBinding = onSubmitRef.current
			? {
					key: "Mod-Enter",
					run: () => {
						console.log("[SqlEditor] Mod-Enter pressed, calling onSubmit");
						onSubmitRef.current?.();
						return true;
					},
				}
			: null;

		const keymapExtensions = submitKeyBinding
			? keymap.of([...defaultKeymap, submitKeyBinding])
			: keymap.of(defaultKeymap);

		const state = EditorState.create({
			doc: valueRef.current,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				sql({ dialect }),
				syntaxHighlighting(defaultHighlightStyle),
				defaultTheme,
				keymapExtensions,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						valueRef.current = newValue;
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

		// Also add a document-level keydown listener as fallback
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault();
				console.log(
					"[SqlEditor] Ctrl/Meta+Enter detected via document listener",
				);
				onSubmitRef.current?.();
			}
		};
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			view.destroy();
			viewRef.current = null;
		};
	}, [engine, disabled, placeholderText]);

	return (
		<div
			ref={editorRef}
			className={`overflow-hidden rounded-md border bg-muted/30 ${className}`}
			style={{ minHeight: "120px" }}
		/>
	);
}
