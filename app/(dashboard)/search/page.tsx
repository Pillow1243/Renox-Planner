'use client';

/**
 * جست‌وجوی سراسری
 *  - جست‌وجو در تسک، یادداشت، ژورنال، رویداد، مالی، هدف و پروژه
 *  - فیلتر بر اساس نوع و بازه زمانی، هایلایت نتایج
 */
import * as React from 'react';
import Link from 'next/link';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { formatJalali } from '@/lib/jalali';
import { buildSearchIndex, searchIndex, type SearchableItem } from '@/lib/selectors';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Field, SegmentedControl, Skeleton } from '@/components/ui/primitives';
import { PageHeader } from '@/components/shared/page-header';

const TYPE_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  task: { label: 'تسک', icon: 'CheckSquare', color: '#57886A' },
  note: { label: 'یادداشت', icon: 'StickyNote', color: '#AD9268' },
  journal: { label: 'ژورنال', icon: 'BookHeart', color: '#B06A79' },
  event: { label: 'رویداد', icon: 'CalendarDays', color: '#6C7FA8' },
  transaction: { label: 'مالی', icon: 'Wallet', color: '#BE7857' },
  goal: { label: 'هدف', icon: 'Target', color: '#8C6FA8' },
  project: { label: 'پروژه', icon: 'FolderKanban', color: '#4F8A96' },
  habit: { label: 'عادت', icon: 'Flame', color: '#C0554A' },
};

/** برجسته‌سازی بخش منطبق با عبارت جست‌وجو */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim();
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="mark">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}

export default function SearchPage() {
  const state = usePlanner();
  const mounted = useMounted();
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | SearchableItem['type']>('all');
  const [daysFilter, setDaysFilter] = React.useState<'all' | '7' | '30' | '365'>('all');

  // عبارت جست‌وجو از پارامتر URL (اگر از پالت فرمان آمده باشیم)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setQuery(q);
  }, []);

  const index = React.useMemo(
    () =>
      buildSearchIndex({
        tasks: state.tasks,
        notes: state.notes,
        habits: state.habits,
        journal: state.journal,
        events: state.events,
        transactions: state.transactions,
        goals: state.goals,
        projects: state.projects,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.notes, state.habits, state.journal, state.events, state.transactions, state.goals, state.projects]
  );

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    let list = searchIndex(index, query, 200);
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter);
    if (daysFilter !== 'all') {
      const limit = Date.now() - Number(daysFilter) * 86400000;
      list = list.filter((r) => !r.date || new Date(r.date).getTime() >= limit);
    }
    return list;
  }, [index, query, typeFilter, daysFilter]);

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    searchIndex(index, query, 500).forEach((r) => map.set(r.type, (map.get(r.type) ?? 0) + 1));
    return map;
  }, [index, query]);

  return (
    <div>
      <PageHeader title="جست‌وجوی سراسری" description="در تمام ماژول‌ها جست‌وجو کن — با فیلتر نوع و بازه زمانی" icon="Search" />

      <Card className="mb-5 space-y-3.5 p-4">
        <div className="relative">
          <Icon name="Search" size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-subtle))]" />
          <Field
            autoFocus
            className="!py-3 pr-11 !text-[15px]"
            placeholder="مثلاً: گزارش، خرید، جلسه، کتاب…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
              aria-label="پاک‌کردن"
            >
              <Icon name="X" size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'all', label: `همه ${query ? `(${toPersianDigits(searchIndex(index, query, 500).length)})` : ''}` },
              ...(Object.entries(TYPE_LABEL)
                .filter(([key]) => counts.has(key))
                .map(([key, meta]) => ({
                  value: key as SearchableItem['type'],
                  label: `${meta.label} (${toPersianDigits(counts.get(key) ?? 0)})`,
                  icon: meta.icon,
                })) as { value: SearchableItem['type']; label: string; icon: string }[]),
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />

          <SegmentedControl
            size="sm"
            options={[
              { value: 'all', label: 'همه زمان‌ها' },
              { value: '7', label: '۷ روز' },
              { value: '30', label: '۳۰ روز' },
              { value: '365', label: 'یک سال' },
            ]}
            value={daysFilter}
            onChange={setDaysFilter}
          />
        </div>
      </Card>

      {!mounted ? (
        <div className="space-y-2">
          <Skeleton className="h-16" count={5} />
        </div>
      ) : !query.trim() ? (
        <Card>
          <EmptyState
            icon="Search"
            title="چه چیزی را می‌خواهی پیدا کنی؟"
            description="عبارتی بنویس — در تسک‌ها، یادداشت‌ها، ژورنال، رویدادها، تراکنش‌ها، اهداف و پروژه‌ها جست‌وجو می‌کنیم."
          />
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState
            icon="Filter"
            title="نتیجه‌ای پیدا نشد"
            description="املای دیگری را امتحان کن یا فیلترها را ساده‌تر کن."
            action={
              <Button
                variant="outline"
                icon="RotateCcw"
                onClick={() => {
                  setTypeFilter('all');
                  setDaysFilter('all');
                }}
              >
                پاک‌کردن فیلترها
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <p className="num mb-3 text-[12px] text-[rgb(var(--text-subtle))]">{toPersianDigits(results.length)} نتیجه پیدا شد</p>
          <ul className="space-y-2">
            {results.map((item) => {
              const meta = TYPE_LABEL[item.type];
              return (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${meta.color}1F`, color: meta.color }}>
                      <Icon name={meta.icon} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold leading-6">
                        <Highlight text={item.title} query={query} />
                      </p>
                      {item.subtitle && (
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-6 text-[rgb(var(--text-subtle))]">
                          <Highlight text={item.subtitle} query={query} />
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge color={meta.color}>{meta.label}</Badge>
                        {item.date && <span className="num chip bg-[rgb(var(--text)/0.06)] text-[10px]">{formatJalali(item.date, 'DD MMMM YYYY')}</span>}
                        {item.tags?.slice(0, 3).map((t) => (
                          <span key={t} className="chip bg-[rgb(var(--text)/0.06)] text-[10px] text-[rgb(var(--text-subtle))]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Icon name="ChevronLeft" size={17} className="mt-2 shrink-0 text-[rgb(var(--text-subtle))]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
