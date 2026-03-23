import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { defaultKeymap } from "@codemirror/commands";
import { MySQL, PostgreSQL, sql } from "@codemirror/lang-sql";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	placeholder,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";

const sqlHighlightStyle = HighlightStyle.define([
	{ tag: tags.keyword, color: "#c678dd", fontWeight: "bold" },
	{ tag: tags.operatorKeyword, color: "#c678dd", fontWeight: "bold" },
	{ tag: tags.controlKeyword, color: "#c678dd", fontWeight: "bold" },
	{ tag: tags.typeName, color: "#e5c07b" },
	{ tag: tags.typeOperator, color: "#e5c07b" },
	{ tag: tags.name, color: "#e06c75" },
	{ tag: tags.propertyName, color: "#e06c75" },
	{ tag: tags.className, color: "#e5c07b" },
	{ tag: tags.number, color: "#d19a66" },
	{ tag: tags.string, color: "#98c379" },
	{ tag: tags.special(tags.string), color: "#98c379" },
	{ tag: tags.comment, color: "#7f848e", fontStyle: "italic" },
	{ tag: tags.variableName, color: "#e06c75" },
	{ tag: tags.function(tags.variableName), color: "#61afef" },
	{ tag: tags.operator, color: "#56b6c2" },
	{ tag: tags.punctuation, color: "#abb2bf" },
	{ tag: tags.brace, color: "#abb2bf" },
	{ tag: tags.bracket, color: "#abb2bf" },
	{ tag: tags.paren, color: "#abb2bf" },
	{ tag: tags.bool, color: "#d19a66" },
	{ tag: tags.null, color: "#d19a66" },
	{ tag: tags.unit, color: "#d19a66" },
]);

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
		caretColor: "#f59e0b",
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
	".cm-cursor": {
		borderLeftColor: "#f59e0b",
		borderLeftWidth: "3px",
	},
	".cm-cursorPrimary": {
		borderLeftColor: "#f59e0b",
		borderLeftWidth: "3px",
	},
	"&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-cursor": {
		borderLeftColor: "#f59e0b",
		borderLeftWidth: "3px",
	},
	"&.cm-focused .cm-activeLine": {
		backgroundColor: "rgba(245, 158, 11, 0.1)",
	},
	"&.cm-focused .cm-selectionBackground, ::selection": {
		backgroundColor: "var(--accent)",
	},
	".cm-placeholder": {
		color: "var(--muted-foreground)",
	},
	".cm-tooltip": {
		backgroundColor: "var(--popover)",
		borderColor: "var(--border)",
		borderWidth: "1px",
		borderStyle: "solid",
		borderRadius: "var(--radius-md)",
		boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
	},
	".cm-tooltip.cm-tooltip-autocomplete": {
		backgroundColor: "var(--popover)",
	},
	".cm-tooltip-autocomplete ul li[aria-selected]": {
		backgroundColor: "var(--accent)",
		color: "var(--accent-foreground)",
	},
	".cm-completionLabel": {
		color: "var(--popover-foreground)",
	},
	".cm-completionDetail": {
		color: "var(--muted-foreground)",
		fontSize: "0.85em",
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
				highlightActiveLine(),
				drawSelection({
					cursorBlinkRate: 530,
				}),
				sql({ dialect }),
				syntaxHighlighting(sqlHighlightStyle),
				defaultTheme,
				keymapExtensions,
				closeBrackets(),
				autocompletion({
					defaultKeymap: true,
					closeOnBlur: true,
				}),
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
			style={{
				minHeight: "120px",
				["--cm-cursor-color" as string]: "#f59e0b",
			}}
		/>
	);
}
