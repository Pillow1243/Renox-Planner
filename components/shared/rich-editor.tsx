'use client';

/**
 * ویرایشگر متن غنی بر پایه TipTap
 * پشتیبانی از تیتر، بولد، ایتالیک، لیست، نقل‌قول، لینک، کد و پاک‌کردن قالب.
 */
import * as React from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg transition-colors',
        active
          ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]'
          : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.07)]'
      )}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

export function RichEditor({
  value,
  onChange,
  placeholder = 'اینجا بنویس…',
  minHeight = 220,
  className,
  paper,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  /** پس‌زمینه کاغذی برای ژورنال */
  paper?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false, // سازگاری با رندر استاتیک (Next.js export)
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose-renox max-w-none outline-none px-4 py-3.5 text-sm leading-8',
          paper && 'paper rounded-2xl'
        ),
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  // همگام‌سازی وقتی مقدار از بیرون عوض می‌شود (مثلاً انتخاب تاریخ دیگر در ژورنال)
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current && !editor.isFocused) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="skeleton" style={{ height: minHeight }} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-2 py-1.5">
        <ToolbarButton icon="Feather" label="تیتر" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <ToolbarButton icon="ListChecks" label="تیتر ۲" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <span className="mx-1 h-5 w-px bg-[rgb(var(--border))]" />
        <ToolbarButton icon="Sparkles" label="بولد" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton icon="PenLine" label="ایتالیک" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton icon="Minus" label="خط‌خورده" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <span className="mx-1 h-5 w-px bg-[rgb(var(--border))]" />
        <ToolbarButton icon="ListFilter" label="لیست نقطه‌ای" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton icon="ListChecks" label="لیست شماره‌دار" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolbarButton icon="Quote" label="نقل‌قول" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <span className="mx-1 h-5 w-px bg-[rgb(var(--border))]" />
        <ToolbarButton
          icon="LinkIcon"
          label="لینک"
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('آدرس لینک:', editor.getAttributes('link').href ?? 'https://');
            if (url === null) return;
            if (url === '') editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        />
        <ToolbarButton icon="RotateCcw" label="حذف قالب" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} />
        <span className="flex-1" />
        <ToolbarButton icon="CornerDownLeft" label="واگرد" onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton icon="RefreshCw" label="ازنو" onClick={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} style={{ minHeight }} />
    </div>
  );
}

/** شمارش کلمات متن HTML */
export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export type { Editor };
export default RichEditor;
