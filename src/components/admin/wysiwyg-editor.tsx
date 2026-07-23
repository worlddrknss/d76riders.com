"use client";

import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Undo2 } from "lucide-react";

/**
 * `site` sits on the light canvas the public composers use; `admin` sits on the
 * dark console shell. Both are District 76's palette — sunset accents, asphalt
 * ground — rather than a borrowed slate-and-blue theme.
 */
type EditorTone = "site" | "admin";

type WysiwygEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  tone?: EditorTone;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: EditorTone;
};

const TONE = {
  site: {
    shell: "border-border bg-surface",
    toolbar: "border-border bg-canvas",
    body: "rte-body bg-surface text-ink",
    button: "border-border bg-canvas text-muted hover:border-sunset/50 hover:text-sunset",
    buttonActive: "border-sunset/60 bg-sunset/10 text-sunset",
    input: "border-border bg-canvas text-ink placeholder:text-muted focus:border-sunset/70",
    ghost: "border-border text-muted hover:bg-canvas hover:text-ink",
    icon: "text-muted",
    loading: "border-border bg-canvas text-muted",
  },
  admin: {
    shell: "border-white/10 bg-asphalt",
    toolbar: "border-white/10 bg-white/5",
    body: "rte-body rte-body--dark bg-asphalt text-slate-100",
    button: "border-white/15 bg-white/5 text-slate-200 hover:border-sunset/50 hover:text-sunset",
    buttonActive: "border-sunset/60 bg-sunset/20 text-white",
    input: "border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500 focus:border-sunset/70",
    ghost: "border-white/20 text-slate-300 hover:bg-white/10",
    icon: "text-slate-400",
    loading: "border-white/10 bg-white/5 text-slate-300",
  },
} as const;

function ToolbarButton({ onClick, active, disabled, label, icon: Icon, tone }: ToolbarButtonProps) {
  const theme = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${
        active ? theme.buttonActive : theme.button
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  tone = "site",
}: WysiwygEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const theme = TONE[tone];

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `${theme.body} min-h-56 rounded-b-lg px-4 py-3 text-sm outline-none`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentValue = editor.getHTML();
    if (currentValue !== value) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  const canUseLink = useMemo(() => {
    if (!editor) {
      return false;
    }

    return editor.state.selection.from !== editor.state.selection.to;
  }, [editor]);

  if (!editor) {
    return <div className={`rounded-lg border p-4 text-sm ${theme.loading}`}>Loading editor...</div>;
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${theme.shell}`}>
      <div className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${theme.toolbar}`}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Bold"
          icon={Bold}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italic"
          icon={Italic}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Bullet list"
          icon={List}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Ordered list"
          icon={ListOrdered}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          label="Block quote"
          icon={Quote}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          label="Clear formatting"
          icon={RemoveFormatting}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
          icon={Undo2}
          tone={tone}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
          icon={Redo2}
          tone={tone}
        />

        <div className="ml-auto flex min-w-60 items-center gap-2">
          <div className="relative flex-1">
            <Link2 className={`pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 ${theme.icon}`} />
            <input
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
              className={`w-full rounded-md border py-1.5 pl-8 pr-2 text-xs focus:outline-none ${theme.input}`}
            />
          </div>
          <button
            type="button"
            disabled={!canUseLink || !linkUrl.trim()}
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
              setLinkUrl("");
            }}
            className="rounded-md bg-sunset px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-sunset/85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Add Link
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${theme.ghost}`}
          >
            Clear
          </button>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
