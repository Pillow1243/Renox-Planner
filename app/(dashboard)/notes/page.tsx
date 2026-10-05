'use client';

/**
 * یادداشت‌ها
 *  - پوشه‌ها، برچسب‌ها، سنجاق‌کردن و جست‌وجو
 *  - ویرایشگر متن غنی (TipTap) با ترجمه و بررسی گرامر آنلاین (APIهای رایگان)
 *  - تبدیل یادداشت به تسک در یک کلیک
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { formatJalali } from '@/lib/jalali';
import { cn, stripHtml, toPersianDigits, truncate } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button, Card, EmptyState, Field, SegmentedControl, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { NoteDialog } from '@/components/shared/dialogs';
import { RichEditor, countWords } from '@/components/shared/rich-editor';
import { translate, checkGrammar, lookupWord, type GrammarIssue, type DictionaryEntry } from '@/lib/external-apis';
import type { Note } from '@/lib/types';

export default function NotesPage() {
  const notes = usePlanner((s) => s.notes);
  const folders = usePlanner((s) => s.folders);
  const addFolder = usePlanner((s) => s.addFolder);
  const removeFolder = usePlanner((s) => s.removeFolder);
  const updateNote = usePlanner((s) => s.updateNote);
  const removeNote = usePlanner((s) => s.removeNote);
  const addTask = usePlanner((s) => s.addTask);
  const mounted = useMounted();
  const toast = useToast();

  const [folderId, setFolderId] = React.useState<string>('all');
  const [query, setQuery] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Note | null>(null);
  const [openNote, setOpenNote] = React.useState<Note | null>(null);
  const [deleting, setDeleting] = React.useState<Note | null>(null);
  const [newFolder, setNewFolder] = React.useState('');
  const [folderDialog, setFolderDialog] = React.useState(false);
  const [toolPanel, setToolPanel] = React.useState<'none' | 'translate' | 'grammar' | 'dictionary'>('none');
  const [toolBusy, setToolBusy] = React.useState(false);
  /** نتیجه ابزار: متن ترجمه، فهرست خطاهای گرامری یا مدخل‌های دیکشنری */
  const [toolResult, setToolResult] = React.useState<
    { kind: 'text'; text: string } | { kind: 'issues'; items: GrammarIssue[] } | { kind: 'dict'; items: DictionaryEntry[] } | null
  >(null);
  const [toolQuery, setToolQuery] = React.useState('');

  const current = usePlanner((s) => s.notes.find((n) => n.id === openNote?.id));

  const allTags = React.useMemo(() => [...new Set(notes.flatMap((n) => n.tags))], [notes]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (folderId === 'pinned' && !n.pinned) return false;
        if (folderId !== 'all' && folderId !== 'pinned' && n.folderId !== folderId) return false;
        if (tagFilter && !n.tags.includes(tagFilter)) return false;
        if (q && !`${n.title} ${stripHtml(n.content)} ${n.tags.join(' ')}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, folderId, query, tagFilter]);

  /** ترجمه متن یادداشت */
  const runTranslate = async (target: string) => {
    if (!current) return;
    setToolBusy(true);
    const text = stripHtml(current.content).slice(0, 1500);
    const res = await translate(text, target, 'auto');
    setToolResult({ kind: 'text', text: res.text });
    setToolBusy(false);
  };

  /** بررسی گرامر */
  const runGrammar = async () => {
    if (!current) return;
    setToolBusy(true);
    const text = stripHtml(current.content).slice(0, 1500);
    const res = await checkGrammar(text, 'en-US');
    setToolResult({ kind: 'issues', items: res });
    setToolBusy(false);
    toast.info(res.length ? `${toPersianDigits(res.length)} نکته گرامری پیدا شد` : 'مشکلی پیدا نشد', 'سرویس LanguageTool');
  };

  /** دیکشنری */
  const runDictionary = async () => {
    if (!toolQuery.trim()) return;
    setToolBusy(true);
    const res = await lookupWord(toolQuery.trim());
    setToolResult({ kind: 'dict', items: res });
    setToolBusy(false);
  };

  return (
    <div>
      <PageHeader
        title="یادداشت‌ها"
        description="افکار، لیست‌ها و ایده‌هایت را با ویرایشگر غنی ثبت کن"
        icon="StickyNote"
        actions={
          <>
            <Button size="sm" variant="outline" icon="Folder" onClick={() => setFolderDialog(true)}>
              پوشه جدید
            </Button>
            <Button
              size="sm"
              icon="Plus"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              یادداشت جدید
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        {/* ستون پوشه‌ها */}
        <Card className="h-max p-3.5">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-subtle))]">پوشه‌ها</p>
          <ul className="space-y-1">
            {[
              { id: 'all', name: 'همه یادداشت‌ها', icon: 'StickyNote', count: notes.length },
              { id: 'pinned', name: 'سنجاق‌شده', icon: 'Pin', count: notes.filter((n) => n.pinned).length },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setFolderId(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-[13px] transition-colors',
                    folderId === item.id ? 'bg-[rgb(var(--accent-soft))] font-semibold text-[rgb(var(--accent))]' : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.05)]'
                  )}
                >
                  <Icon name={item.icon} size={16} />
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="num text-[10px] opacity-70">{toPersianDigits(item.count)}</span>
                </button>
              </li>
            ))}
            {folders.map((f) => (
              <li key={f.id} className="group">
                <button
                  onClick={() => setFolderId(f.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-[13px] transition-colors',
                    folderId === f.id ? 'bg-[rgb(var(--accent-soft))] font-semibold text-[rgb(var(--accent))]' : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.05)]'
                  )}
                >
                  <Icon name={f.icon} size={16} style={{ color: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="num text-[10px] opacity-70">{toPersianDigits(notes.filter((n) => n.folderId === f.id).length)}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFolder(f.id);
                      if (folderId === f.id) setFolderId('all');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && removeFolder(f.id)}
                    className="rounded p-0.5 text-[rgb(var(--text-subtle))] opacity-0 transition-opacity hover:text-[rgb(var(--danger))] group-hover:opacity-100"
                    aria-label="حذف پوشه"
                  >
                    <Icon name="X" size={12} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {allTags.length > 0 && (
            <>
              <p className="mb-2 mt-4 px-1 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-subtle))]">برچسب‌ها</p>
              <div className="flex flex-wrap gap-1.5 px-1">
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                    className={cn(
                      'chip text-[10px]',
                      tagFilter === t ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]' : 'bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]'
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* فهرست یادداشت‌ها */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Icon name="Search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-subtle))]" />
              <Field className="pr-9" placeholder="جست‌وجو در یادداشت‌ها…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {(tagFilter || query) && (
              <Button
                size="sm"
                variant="ghost"
                icon="X"
                onClick={() => {
                  setTagFilter('');
                  setQuery('');
                }}
              >
                پاک‌کردن فیلتر
              </Button>
            )}
          </div>

          {!mounted ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-40" count={6} />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon="StickyNote"
                title={query ? 'یادداشتی پیدا نشد' : 'هنوز یادداشتی نداری'}
                description="اولین ایده‌ات را بنویس؛ حتی یک خط هم کافی است."
                action={
                  <Button
                    icon="Plus"
                    onClick={() => {
                      setEditing(null);
                      setDialogOpen(true);
                    }}
                  >
                    یادداشت جدید
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {filtered.map((note) => {
                  const folder = folders.find((f) => f.id === note.folderId);
                  return (
                    <motion.div key={note.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                      <Card interactive className="group flex h-full flex-col p-4" onClick={() => setOpenNote(note)}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-[14px] font-bold leading-6">{note.title}</h3>
                          {note.pinned && <Icon name="Pin" size={14} className="shrink-0 rotate-45 text-[rgb(var(--accent))]" />}
                        </div>
                        <p className="line-clamp-3 flex-1 text-[11.5px] leading-6 text-[rgb(var(--text-subtle))]">{truncate(stripHtml(note.content), 150)}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {folder && (
                            <span className="chip text-[10px]" style={{ backgroundColor: `${folder.color}1F`, color: folder.color }}>
                              <Icon name={folder.icon} size={10} /> {folder.name}
                            </span>
                          )}
                          {note.tags.slice(0, 2).map((t) => (
                            <span key={t} className="chip bg-[rgb(var(--text)/0.06)] text-[10px] text-[rgb(var(--text-subtle))]">
                              #{t}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--border))] pt-2.5">
                          <span className="num text-[10px] text-[rgb(var(--text-subtle))]">{formatJalali(note.updatedAt, 'DD MMMM YYYY')}</span>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateNote(note.id, { pinned: !note.pinned });
                              }}
                              className="rounded-lg p-1 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.08)]"
                              aria-label="سنجاق"
                            >
                              <Icon name={note.pinned ? 'PinOff' : 'Pin'} size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleting(note);
                              }}
                              className="rounded-lg p-1 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                              aria-label="حذف"
                            >
                              <Icon name="Trash2" size={13} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* پنجره مشاهده/ویرایش یادداشت */}
      <Modal
        open={Boolean(openNote && current)}
        onClose={() => {
          setOpenNote(null);
          setToolPanel('none');
          setToolResult(null);
        }}
        title={current?.title}
        description={current ? `${toPersianDigits(countWords(current.content))} کلمه — آخرین ویرایش ${formatJalali(current.updatedAt, 'DD MMMM YYYY — HH:mm')}` : undefined}
        size="xl"
        footer={
          <>
            <Button
              variant="ghost"
              icon="CheckSquare"
              onClick={() => {
                if (!current) return;
                addTask({
                  title: current.title,
                  description: stripHtml(current.content).slice(0, 400),
                  tags: current.tags,
                  priority: 'medium',
                });
                toast.success('یادداشت به تسک تبدیل شد', 'در ماژول تسک‌ها پیدا می‌کنی.');
              }}
            >
              تبدیل به تسک
            </Button>
            <Button
              variant="outline"
              icon="Pencil"
              onClick={() => {
                setEditing(current ?? null);
                setOpenNote(null);
                setDialogOpen(true);
              }}
            >
              ویرایش
            </Button>
            <Button
              icon="Save"
              onClick={() => {
                if (!current) return;
                updateNote(current.id, { title: current.title, content: current.content });
                toast.success('تغییرات ذخیره شد');
                setOpenNote(null);
              }}
            >
              ذخیره
            </Button>
          </>
        }
      >
        {current && (
          <div className="space-y-4 pt-1">
            {/* ابزارهای هوشمند */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-2.5">
              <span className="chip bg-[rgb(var(--accent-soft))] text-[11px] text-[rgb(var(--accent))]">
                <Icon name="Wand2" size={12} /> ابزارهای رایگان
              </span>
              <SegmentedControl
                size="sm"
                options={[
                  { value: 'none', label: 'بستن' },
                  { value: 'translate', label: 'ترجمه', icon: 'Languages' },
                  { value: 'grammar', label: 'گرامر', icon: 'Sparkles' },
                  { value: 'dictionary', label: 'دیکشنری', icon: 'BookOpen' },
                ]}
                value={toolPanel}
                onChange={(v) => {
                  setToolPanel(v);
                  setToolResult(null);
                  if (v === 'grammar') void runGrammar();
                }}
              />

              {toolPanel === 'translate' && (
                <div className="flex gap-1.5">
                  {[
                    { code: 'en', label: 'انگلیسی' },
                    { code: 'fa', label: 'فارسی' },
                    { code: 'ar', label: 'عربی' },
                    { code: 'de', label: 'آلمانی' },
                  ].map((l) => (
                    <Button key={l.code} size="sm" variant="outline" loading={toolBusy} onClick={() => void runTranslate(l.code)}>
                      {l.label}
                    </Button>
                  ))}
                </div>
              )}

              {toolPanel === 'dictionary' && (
                <div className="flex gap-1.5">
                  <Field className="!w-40" placeholder="کلمه انگلیسی…" value={toolQuery} onChange={(e) => setToolQuery(e.target.value)} />
                  <Button size="sm" variant="outline" loading={toolBusy} onClick={() => void runDictionary()}>
                    جست‌وجو
                  </Button>
                </div>
              )}
            </div>

            {/* نتیجه ابزار */}
            {toolResult && (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3.5 text-[13px] leading-7">
                {toolResult.kind === 'text' && <p className="whitespace-pre-wrap">{toolResult.text || 'نتیجه‌ای برنگشت.'}</p>}

                {toolResult.kind === 'issues' &&
                  (toolResult.items.length === 0 ? (
                    <p className="text-[rgb(var(--text-subtle))]">مشکل گرامری یا املایی پیدا نشد ✨</p>
                  ) : (
                    <ul className="space-y-2">
                      {toolResult.items.slice(0, 8).map((issue, i) => (
                        <li key={i} className="rounded-lg bg-[rgb(var(--text)/0.04)] p-2">
                          <p className="font-semibold">{issue.message}</p>
                          {issue.replacements?.length > 0 && (
                            <p className="mt-1 text-[11px] text-[rgb(var(--accent))]">پیشنهاد: {issue.replacements.slice(0, 3).join(' ، ')}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ))}

                {toolResult.kind === 'dict' &&
                  (toolResult.items.length === 0 ? (
                    <p className="text-[rgb(var(--text-subtle))]">واژه‌ای پیدا نشد. املای انگلیسی را بررسی کن.</p>
                  ) : (
                    <ul className="space-y-3">
                      {toolResult.items.map((entry) => (
                        <li key={entry.word}>
                          <p className="font-bold">
                            {entry.word} {entry.phonetic && <span className="num text-[11px] opacity-70">/{entry.phonetic}/</span>}
                          </p>
                          {entry.meanings.map((m) => (
                            <div key={m.partOfSpeech} className="mt-1">
                              <p className="text-[11px] font-semibold text-[rgb(var(--accent))]">{m.partOfSpeech}</p>
                              <ul className="mr-4 list-disc">
                                {m.definitions.map((d, i) => (
                                  <li key={i} className="text-[12px]">
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  ))}
              </div>
            )}

            <RichEditor
              value={current.content}
              onChange={(html) => updateNote(current.id, { content: html })}
              paper
              minHeight={320}
            />
          </div>
        )}
      </Modal>

      {/* دیالوگ پوشه */}
      <Modal
        open={folderDialog}
        onClose={() => setFolderDialog(false)}
        title="پوشه جدید"
        size="sm"
        footer={
          <Button
            icon="Plus"
            onClick={() => {
              if (!newFolder.trim()) return;
              addFolder({ name: newFolder.trim(), icon: 'Folder', color: '#AD9268' });
              setNewFolder('');
              setFolderDialog(false);
              toast.success('پوشه ساخته شد');
            }}
          >
            ساخت
          </Button>
        }
      >
        <Field autoFocus value={newFolder} placeholder="نام پوشه" onChange={(e) => setNewFolder(e.target.value)} />
      </Modal>

      <NoteDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        note={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeNote(deleting.id);
            toast.success('یادداشت حذف شد');
          }
        }}
        title="حذف یادداشت"
        message={`یادداشت «${deleting?.title}» حذف شود؟`}
      />
    </div>
  );
}
