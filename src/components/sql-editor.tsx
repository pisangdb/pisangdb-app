import { defaultKeymap } from "@codemirror/commands";
import { MySQL, PostgreSQL, sql } from "@codemirror/lang-sql";
import {
	defaultHighlightStyle,
	syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
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

// Compartment instance for read-only toggle — module-level so same instance persists
const editableCompartment = new Compartment();

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

	// Keep refs current
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);

	// Create editor once when engine or placeholderText changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-mount on engine/placeholderText; value synced separately
	useEffect(() => {
		if (!editorRef.current) return;

		const dialect =
			engine === "mysql" || engine === "mariadb" ? MySQL : PostgreSQL;

		// Remove Mod-Enter from defaultKeymap to avoid precedence conflict
		const filteredDefaultKeymap = defaultKeymap.filter(
			(kb) => !kb.key?.includes("Mod-Enter"),
		);

		const submitKeyBinding = {
			key: "Mod-Enter",
			run: (view: EditorView) => {
				if (!view.hasFocus) view.focus();
				onSubmitRef.current?.();
				return true;
			},
		};

		const state = EditorState.create({
			doc: value,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				sql({ dialect }),
				syntaxHighlighting(defaultHighlightStyle),
				defaultTheme,
				keymap.of([...filteredDefaultKeymap, submitKeyBinding]),
				placeholder(placeholderText),
				editableCompartment.of(EditorView.editable.of(!disabled)),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onChangeRef.current(update.state.doc.toString());
					}
				}),
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
	}, [engine, placeholderText]);

	// Sync external value changes (e.g. "Clear" button)
	useEffect(() => {
		if (!viewRef.current) return;
		const view = viewRef.current;
		if (view.state.doc.toString() === value) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
		});
	}, [value]);

	// Toggle read-only mode via compartment (no re-mount needed)
	useEffect(() => {
		if (!viewRef.current) return;
		viewRef.current.dispatch({
			effects: editableCompartment.reconfigure(
				disabled ? EditorView.editable.of(false) : EditorView.editable.of(true),
			),
		});
	}, [disabled]);

	return (
		<div
			ref={editorRef}
			className={`overflow-hidden rounded-md border bg-muted/30 ${className}`}
			style={{ minHeight: "120px" }}
		/>
	);
}
