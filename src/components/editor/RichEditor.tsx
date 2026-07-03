import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Minus, Pilcrow,
} from "lucide-react";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg my-4 max-w-full h-auto" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your article…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] px-5 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return <div className="min-h-[420px] rounded-xl border border-border/60 bg-card/40" />;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-40";
  const active = "bg-white/10 text-foreground";
  const g = (b: boolean) => `${btn} ${b ? active : ""}`;

  const promptLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const promptImage = () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-background/40 p-1.5">
      <button type="button" className={btn} onClick={() => editor.chain().focus().undo().run()} aria-label="Undo"><Undo className="h-4 w-4" /></button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().redo().run()} aria-label="Redo"><Redo className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-border/60" />
      <button type="button" className={g(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="H1"><Heading1 className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="H2"><Heading2 className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="H3"><Heading3 className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("paragraph"))} onClick={() => editor.chain().focus().setParagraph().run()} aria-label="Paragraph"><Pilcrow className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-border/60" />
      <button type="button" className={g(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Strike"><Strikethrough className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Code"><Code className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-border/60" />
      <button type="button" className={g(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered list"><ListOrdered className="h-4 w-4" /></button>
      <button type="button" className={g(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote"><Quote className="h-4 w-4" /></button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Divider"><Minus className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-border/60" />
      <button type="button" className={g(editor.isActive("link"))} onClick={promptLink} aria-label="Link"><LinkIcon className="h-4 w-4" /></button>
      <button type="button" className={btn} onClick={promptImage} aria-label="Image"><ImageIcon className="h-4 w-4" /></button>
    </div>
  );
}
