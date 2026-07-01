"use client";

import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Undo2 } from "lucide-react";

type WysiwygEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function ToolbarButton({ onClick, active, disabled, label, icon: Icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-slate-200 transition ${
        active
          ? "border-blue-400/60 bg-blue-500/20"
          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function WysiwygEditor({ value, onChange, placeholder = "Start writing..." }: WysiwygEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");

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
        class: "admin-tiptap min-h-56 rounded-b-lg bg-[#020617] px-4 py-3 text-sm text-slate-100 outline-none",
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
    return <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Loading editor...</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#020617]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#030d1e] px-3 py-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Bold"
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italic"
          icon={Italic}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Bullet list"
          icon={List}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Ordered list"
          icon={ListOrdered}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          label="Block quote"
          icon={Quote}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          label="Clear formatting"
          icon={RemoveFormatting}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
          icon={Undo2}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
          icon={Redo2}
        />

        <div className="ml-auto flex min-w-60 items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-md border border-white/15 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-400/70 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={!canUseLink || !linkUrl.trim()}
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
              setLinkUrl("");
            }}
            className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Add Link
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300 hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
