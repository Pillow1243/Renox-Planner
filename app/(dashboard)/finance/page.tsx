'use client';

/**
 * ماژول مالی
 *  - کیف پول‌ها، درآمد/هزینه، دسته‌بندی‌ها و بودجه ماهانه
 *  - نمودار درآمد/هزینه، دونات دسته‌بندی، نرخ ارز و رمزارز زنده (APIهای رایگان)
 *  - خروجی CSV و خلاصه ماه شمسی
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { addDays, formatJalali, JALALI_MONTHS, startOfDay, toJalali, toGregorian } from '@/lib/jalali';
import { financeSummary } from '@/lib/selectors';
import { ACCOUNT_TYPE_LABEL, TRANSACTION_LABEL } from '@/lib/constants';
import { cn, downloadFile, formatNumber, pct, toCSV, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Progress, SegmentedControl, Select, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { DonutChart, IncomeExpenseChart } from '@/components/ui/charts';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { AccountDialog, BudgetDialog, TransactionDialog } from '@/components/shared/dialogs';
import { getCryptoPrices, getExchangeRates } from '@/lib/external-apis';

type Tab = 'overview' | 'transactions' | 'budgets' | 'markets';

export default function FinancePage() {
  const transactions = usePlanner((s) => s.transactions);
  const categories = usePlanner((s) => s.categories);
  const accounts = usePlanner((s) => s.accounts);
  const budgets = usePlanner((s) => s.budgets);
  const removeTransaction = usePlanner((s) => s.removeTransaction);
  const removeBudget = usePlanner((s) => s.removeBudget);
  const mounted = useMounted();
  const toast = useToast();

  const now = new Date();
  const j = toJalali(now);
  const [tab, setTab] = React.useState<Tab>('overview');
  const [monthOffset, setMonthOffset] = React.useState(0); // نسبت به ماه جاری شمسی
  const [txDialog, setTxDialog] = React.useState(false);
  const [budgetDialog, setBudgetDialog] = React.useState(false);
  const [accountDialog, setAccountDialog] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<null | (typeof budgets)[number]>(null);
  const [deleting, setDeleting] = React.useState<null | string>(null);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [duplicateSource, setDuplicateSource] = React.useState<null | (typeof transactions)[number]>(null);

  /** بازه ماه انتخاب‌شده (شمسی) */
  const range = React.useMemo(() => {
    let jm = j.jm - monthOffset;
    let jy = j.jy;
    while (jm < 1) {
      jm += 12;
      jy -= 1;
    }
    while (jm > 12) {
      jm -= 12;
      jy += 1;
    }
    const start = toGregorian(jy, jm, 1);
    const nextMonthStart = jm === 12 ? toGregorian(jy + 1, 1, 1) : toGregorian(jy, jm + 1, 1);
    const end = addDays(nextMonthStart, -1);
    return { jy, jm, start, end, monthKey: `${jy}-${String(jm).padStart(2, '0')}` };
  }, [j.jm, j.jy, monthOffset]);

  const summary = React.useMemo(
    () => financeSummary(transactions, categories, range.start, range.end),
    [transactions, categories, range]
  );

  const prevRange = React.useMemo(() => {
    const prevEnd = addDays(range.start, -1);
    const prevStart = toGregorian(toJalali(prevEnd).jy, toJalali(prevEnd).jm, 1);
    return { start: prevStart, end: prevEnd };
  }, [range.start]);
  const prevSummary = React.useMemo(() => financeSummary(transactions, categories, prevRange.start, prevRange.end), [transactions, categories, prevRange]);

  /** نقل‌وانتقالات فیلترشده */
  const filteredTx = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        const d = startOfDay(t.date);
        if (d < startOfDay(range.start) || d > startOfDay(range.end)) return false;
        if (q && !`${t.title} ${t.note ?? ''}`.toLowerCase().includes(q)) return false;
        if (typeFilter && t.type !== typeFilter) return false;
        if (categoryFilter && t.categoryId !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, range, search, typeFilter, categoryFilter]);

  /** نمودار ۶ ماه اخیر */
  const sixMonths = React.useMemo(() => {
    const out: { label: string; درآمد: number; هزینه: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      let jm = j.jm - i;
      let jy = j.jy;
      while (jm < 1) {
        jm += 12;
        jy -= 1;
      }
      const start = toGregorian(jy, jm, 1);
      const nextStart = jm === 12 ? toGregorian(jy + 1, 1, 1) : toGregorian(jy, jm + 1, 1);
      const end = addDays(nextStart, -1);
      const s = financeSummary(transactions, categories, start, end);
      out.push({ label: JALALI_MONTHS[jm - 1].slice(0, 4), درآمد: Math.round(s.income / 1_000_000), هزینه: Math.round(s.expense / 1_000_000) });
    }
    return out;
  }, [transactions, categories, j.jm, j.jy]);

  const monthBudgets = budgets.filter((b) => b.month === range.monthKey);
  const totalBudget = monthBudgets.reduce((a, b) => a + b.amount, 0);

  // بازار: نرخ ارز و رمزارز (کش‌شده با React Query)
  const { data: rates, isLoading: ratesLoading } = useQuery({
    queryKey: ['rates', 'USD'],
    queryFn: () => getExchangeRates('USD'),
    staleTime: 60 * 60 * 1000,
    enabled: tab === 'markets',
  });
  const { data: crypto, isLoading: cryptoLoading } = useQuery({
    queryKey: ['crypto'],
    queryFn: getCryptoPrices,
    staleTime: 3 * 60 * 1000,
    enabled: tab === 'markets',
  });

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['تاریخ', 'عنوان', 'نوع', 'دسته‌بندی', 'کیف پول', 'مبلغ (تومان)', 'یادداشت'],
      ...filteredTx.map((t) => [
        formatJalali(t.date, 'YYYY/MM/DD', { persian: false }),
        t.title,
        TRANSACTION_LABEL[t.type],
        categories.find((c) => c.id === t.categoryId)?.name ?? 'دسته‌نشده',
        accounts.find((a) => a.id === t.accountId)?.name ?? '—',
        t.amountBase,
        t.note ?? '',
      ]),
      [],
      ['جمع درآمد', '', '', '', '', summary.income],
      ['جمع هزینه', '', '', '', '', summary.expense],
      ['مانده ماه', '', '', '', '', summary.balance],
    ];
    downloadFile(`renox-finance-${range.monthKey}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    toast.success('فایل CSV ساخته شد', 'با Excel قابل باز کردن است.');
  };

  return (
    <div>
      <PageHeader
        title="مالی"
        description="درآمد، هزینه، بودجه و بازار — همه در یک نمای شفاف"
        icon="Wallet"
        actions={
          <>
            <Button size="sm" variant="outline" icon="Download" onClick={exportCSV}>
              خروجی CSV
            </Button>
            <Button size="sm" variant="outline" icon="Wallet" onClick={() => setAccountDialog(true)}>
              کیف پول
            </Button>
            <Button size="sm" icon="Plus" onClick={() => setTxDialog(true)}>
              تراکنش جدید
            </Button>
          </>
        }
      />

      {/* ناوبری ماه + تب‌ها */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon="ChevronRight" onClick={() => setMonthOffset((m) => m + 1)} aria-label="ماه قبل" />
          <span className="num min-w-[150px] text-center text-sm font-extrabold">
            {JALALI_MONTHS[range.jm - 1]} {toPersianDigits(range.jy)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            disabled={monthOffset === 0}
            aria-label="ماه بعد"
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          {monthOffset > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>
              ماه جاری
            </Button>
          )}
        </div>

        <SegmentedControl
          size="sm"
          options={[
            { value: 'overview', label: 'نمای کلی', icon: 'BarChart3' },
            { value: 'transactions', label: 'تراکنش‌ها', icon: 'ListChecks' },
            { value: 'budgets', label: 'بودجه', icon: 'Target' },
            { value: 'markets', label: 'بازار', icon: 'TrendingUp' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Card>

      {!mounted ? (
        <Skeleton className="h-72" />
      ) : tab === 'overview' ? (
        <div className="space-y-5">
          {/* کارت‌های اصلی */}
          <div className="grid gap-3 lg:grid-cols-4">
            <StatCard
              label="درآمد ماه"
              value={summary.income}
              unit="تومان"
              icon="TrendingUp"
              color="#57886A"
              delta={prevSummary.income ? ((summary.income - prevSummary.income) / prevSummary.income) * 100 : undefined}
              index={0}
            />
            <StatCard
              label="هزینه ماه"
              value={summary.expense}
              unit="تومان"
              icon="TrendingDown"
              color="#BE7857"
              delta={prevSummary.expense ? ((summary.expense - prevSummary.expense) / prevSummary.expense) * 100 : undefined}
              index={1}
            />
            <StatCard
              label="مانده ماه"
              value={summary.balance}
              unit="تومان"
              icon="Wallet"
              color={summary.balance >= 0 ? '#57886A' : '#C0554A'}
              hint={`نرخ پس‌انداز: ${toPersianDigits(summary.savingsRate)}٪`}
              index={2}
            />
            <StatCard label="موجودی کل" value={accounts.reduce((a, b) => a + b.balance, 0)} unit="تومان" icon="Banknote" color="#6C7FA8" index={3} />
          </div>

          {/* کیف پول‌ها */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => (
              <Card key={acc.id} className="relative overflow-hidden p-4">
                <div className="absolute inset-y-0 right-0 w-1.5" style={{ backgroundColor: acc.color }} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-bold">{acc.name}</p>
                    <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">{ACCOUNT_TYPE_LABEL[acc.type]}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: `${acc.color}1F`, color: acc.color }}>
                    <Icon name={acc.type === 'crypto' ? 'Cpu' : acc.type === 'cash' ? 'Banknote' : 'Wallet'} size={16} />
                  </span>
                </div>
                <p className="num mt-3 text-xl font-black">{formatNumber(acc.balance)} <span className="text-xs font-medium">تومان</span></p>
                <Progress
                  className="mt-3"
                  value={pct(acc.balance, accounts.reduce((a, b) => a + b.balance, 0) || 1)}
                  color={acc.color}
                  height={5}
                />
              </Card>
            ))}
          </div>

          {/* نمودارها */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">درآمد در برابر هزینه — ۶ ماه اخیر</h3>
              <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">اعداد به میلیون تومان</p>
              <IncomeExpenseChart data={sixMonths} height={270} />
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">ترکیب هزینه‌ها</h3>
              <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">بر اساس دسته‌بندی در ماه انتخاب‌شده</p>
              {summary.byCategory.length === 0 ? (
                <EmptyState icon="Wallet" title="هزینه‌ای ثبت نشده" description="با ثبت اولین هزینه، نمودار ساخته می‌شود." />
              ) : (
                <DonutChart
                  data={summary.byCategory.slice(0, 7).map((c) => ({ name: c.name, value: Math.round(c.value / 1000), color: c.color }))}
                  height={280}
                  centerLabel="هزار تومان"
                  centerValue={formatNumber(Math.round(summary.expense / 1000))}
                />
              )}
            </Card>
          </div>

          {/* بزرگ‌ترین هزینه‌ها + روزهای پرخرج */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">بزرگ‌ترین هزینه‌های ماه</h3>
              <ul className="space-y-2">
                {filteredTx
                  .filter((t) => t.type === 'expense')
                  .sort((a, b) => b.amountBase - a.amountBase)
                  .slice(0, 6)
                  .map((t) => {
                    const cat = categories.find((c) => c.id === t.categoryId);
                    return (
                      <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: `${cat?.color ?? '#7E7E88'}1F`, color: cat?.color }}>
                          <Icon name={cat?.icon ?? 'Receipt'} size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{t.title}</p>
                          <p className="num text-[10.5px] text-[rgb(var(--text-subtle))]">{formatJalali(t.date, 'DD MMMM')} — {cat?.name ?? 'دسته‌نشده'}</p>
                        </div>
                        <span className="num shrink-0 text-[13px] font-bold text-[rgb(var(--danger))]">{formatNumber(t.amountBase)}</span>
                      </li>
                    );
                  })}
                {filteredTx.filter((t) => t.type === 'expense').length === 0 && (
                  <p className="py-6 text-center text-[11px] text-[rgb(var(--text-subtle))]">هزینه‌ای در این ماه ثبت نشده</p>
                )}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">آخرین تراکنش‌ها</h3>
              <ul className="space-y-2">
                {filteredTx.slice(0, 6).map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const isIncome = t.type === 'income';
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
                      <span
                        className={cn('grid h-9 w-9 place-items-center rounded-xl')}
                        style={{ backgroundColor: isIncome ? 'rgb(var(--success) / 0.14)' : `${cat?.color ?? '#7E7E88'}1F`, color: isIncome ? 'rgb(var(--success))' : cat?.color }}
                      >
                        <Icon name={isIncome ? 'ArrowDownRight' : 'ArrowUpRight'} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{t.title}</p>
                        <p className="num text-[10.5px] text-[rgb(var(--text-subtle))]">{formatJalali(t.date, 'DD MMMM YYYY')}</p>
                      </div>
                      <span className={cn('num shrink-0 text-[13px] font-bold', isIncome ? 'text-[rgb(var(--success))]' : '')}>
                        {isIncome ? '+' : '−'}
                        {formatNumber(t.amountBase)}
                      </span>
                    </li>
                  );
                })}
                {filteredTx.length === 0 && <p className="py-6 text-center text-[11px] text-[rgb(var(--text-subtle))]">تراکنشی در این ماه نیست</p>}
              </ul>
            </Card>
          </div>
        </div>
      ) : tab === 'transactions' ? (
        <div className="space-y-4">
          {/* فیلترها */}
          <Card className="flex flex-wrap items-center gap-3 p-3.5">
            <input
              className="field min-w-[180px] flex-1"
              placeholder="جست‌وجو در تراکنش‌ها…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select className="!w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">همه انواع</option>
              {Object.entries(TRANSACTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select className="!w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <JalaliRetry />
          </Card>

          {/* جدول */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-[rgb(var(--surface-2))] text-[11px] text-[rgb(var(--text-subtle))]">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold">عنوان</th>
                    <th className="px-4 py-3 text-right font-semibold">نوع</th>
                    <th className="px-4 py-3 text-right font-semibold">دسته</th>
                    <th className="px-4 py-3 text-right font-semibold">تاریخ</th>
                    <th className="px-4 py-3 text-left font-semibold">مبلغ (تومان)</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredTx.map((t) => {
                      const cat = categories.find((c) => c.id === t.categoryId);
                      return (
                        <motion.tr
                          key={t.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-t border-[rgb(var(--border))] transition-colors hover:bg-[rgb(var(--text)/0.03)]"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{t.title}</p>
                            {t.note && <p className="text-[11px] text-[rgb(var(--text-subtle))]">{t.note}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color={t.type === 'income' ? '#57886A' : t.type === 'expense' ? '#BE7857' : '#6C7FA8'} dot>
                              {TRANSACTION_LABEL[t.type]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {cat ? (
                              <span className="chip" style={{ backgroundColor: `${cat.color}1F`, color: cat.color }}>
                                <Icon name={cat.icon} size={11} /> {cat.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[rgb(var(--text-subtle))]">—</span>
                            )}
                          </td>
                          <td className="num px-4 py-3 text-[12px] text-[rgb(var(--text-muted))]">{formatJalali(t.date, 'DD MMMM YYYY')}</td>
                          <td className={cn('num px-4 py-3 text-left font-bold', t.type === 'income' && 'text-[rgb(var(--success))]')}>
                            {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}
                            {formatNumber(t.amountBase)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setDuplicateSource(t);
                                  setTxDialog(true);
                                }}
                                className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                                aria-label="کپی تراکنش"
                              >
                                <Icon name="Copy" size={14} />
                              </button>
                              <button
                                onClick={() => setDeleting(t.id)}
                                className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                                aria-label="حذف"
                              >
                                <Icon name="Trash2" size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {filteredTx.length === 0 && (
              <EmptyState icon="Wallet" title="تراکنشی پیدا نشد" description="فیلترها را تغییر بده یا یک تراکنش جدید ثبت کن." />
            )}
          </Card>
        </div>
      ) : tab === 'budgets' ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h3 className="text-sm font-bold">بودجه {JALALI_MONTHS[range.jm - 1]} {toPersianDigits(range.jy)}</h3>
              <p className="num mt-0.5 text-[11px] text-[rgb(var(--text-subtle))]">
                مجموع بودجه: {formatNumber(totalBudget)} تومان — هزینه‌شده: {formatNumber(summary.expense)} تومان
              </p>
            </div>
            <Button
              size="sm"
              icon="Plus"
              onClick={() => {
                setEditingBudget(null);
                setBudgetDialog(true);
              }}
            >
              بودجه جدید
            </Button>
          </Card>

          {monthBudgets.length === 0 ? (
            <Card>
              <EmptyState
                icon="Target"
                title="برای این ماه بودجه‌ای تعیین نکرده‌ای"
                description="تعیین سقف برای دسته‌های پرخرج، بهترین راه کنترل مالی است."
                action={
                  <Button
                    icon="Plus"
                    onClick={() => {
                      setEditingBudget(null);
                      setBudgetDialog(true);
                    }}
                  >
                    تعیین بودجه
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {monthBudgets.map((b) => {
                const cat = categories.find((c) => c.id === b.categoryId);
                const spent = summary.byCategory.find((c) => c.id === b.categoryId)?.value ?? 0;
                const usage = pct(spent, b.amount);
                const over = spent > b.amount;
                return (
                  <Card key={b.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: `${cat?.color ?? '#7E7E88'}1F`, color: cat?.color }}>
                          <Icon name={cat?.icon ?? 'Tag'} size={17} />
                        </span>
                        <div>
                          <p className="text-[13px] font-bold">{cat?.name ?? 'دسته‌نشده'}</p>
                          <p className="num text-[11px] text-[rgb(var(--text-subtle))]">
                            {formatNumber(spent)} از {formatNumber(b.amount)} تومان
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingBudget(b);
                            setBudgetDialog(true);
                          }}
                          className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                          aria-label="ویرایش بودجه"
                        >
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button
                          onClick={() => removeBudget(b.id)}
                          className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                          aria-label="حذف بودجه"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                    <Progress className="mt-3.5" value={usage} color={over ? '#C0554A' : cat?.color} height={9} showLabel />
                    <p className={cn('mt-2 text-[11px]', over ? 'font-bold text-[rgb(var(--danger))]' : 'text-[rgb(var(--text-subtle))]')}>
                      {over
                        ? `${formatNumber(spent - b.amount)} تومان بیش از بودجه خرج کرده‌ای`
                        : `${formatNumber(b.amount - spent)} تومان باقی مانده`}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------ بازار ------------------------------ */
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">نرخ ارز زنده</h3>
                <p className="text-[11px] text-[rgb(var(--text-subtle))]">
                  منبع: {rates?.source === 'er-api' ? 'open.er-api.com (بدون کلید)' : rates?.source === 'frankfurter' ? 'frankfurter.app (بدون کلید)' : 'داده‌ی محلی پشتیبان'}
                  {rates?.updatedAt && ` — به‌روزرسانی: ${new Date(rates.updatedAt).toLocaleString('fa-IR')}`}
                </p>
              </div>
              <Badge color="#57886A" dot>
                رایگان
              </Badge>
            </div>
            {ratesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" count={4} />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { code: 'EUR', name: 'یورو', icon: '€' },
                  { code: 'GBP', name: 'پوند', icon: '£' },
                  { code: 'AED', name: 'درهم', icon: 'د.إ' },
                  { code: 'TRY', name: 'لیر ترکیه', icon: '₺' },
                  { code: 'CNY', name: 'یوان', icon: '¥' },
                  { code: 'JPY', name: 'ین', icon: '¥' },
                  { code: 'IRR', name: 'ریال ایران', icon: '﷼' },
                  { code: 'CAD', name: 'دلار کانادا', icon: 'C$' },
                ].map((cur) => {
                  const rate = rates?.rates?.[cur.code];
                  return (
                    <div key={cur.code} className="rounded-2xl border border-[rgb(var(--border))] p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold">{cur.name}</span>
                        <span className="num text-lg font-bold opacity-60">{cur.icon}</span>
                      </div>
                      <p className="num mt-2 text-lg font-black">
                        {rate ? formatNumber(rate, { digits: rate > 100 ? 0 : 4 }) : '—'}
                      </p>
                      <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">به ازای ۱ دلار</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">قیمت رمزارزها</h3>
                <p className="text-[11px] text-[rgb(var(--text-subtle))]">منبع: CoinGecko (بدون کلید) — به‌روزرسانی هر ۳ دقیقه</p>
              </div>
              <Badge color="#57886A" dot>
                رایگان
              </Badge>
            </div>
            {cryptoLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-20" count={6} />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {crypto?.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-3.5">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgb(var(--text)/0.06)] text-lg font-bold">{c.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold">{c.name}</p>
                      <p className="num text-[11px] text-[rgb(var(--text-subtle))]">{c.symbol}</p>
                    </div>
                    <div className="text-left">
                      <p className="num text-[13px] font-bold">
                        {c.priceUsd ? `$${formatNumber(c.priceUsd, { persian: false, digits: c.priceUsd < 10 ? 2 : 0 })}` : '—'}
                      </p>
                      {c.change24h !== 0 && (
                        <p className={cn('num text-[11px] font-bold', c.change24h >= 0 ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--danger))]')}>
                          {c.change24h >= 0 ? '▲' : '▼'} {toPersianDigits(Math.abs(c.change24h).toFixed(1))}٪
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
              نکته: برای سهام جهانی می‌توانی کلید رایگان Alpha Vantage را در تنظیمات → کلیدهای API وارد کنی. بدون کلید، داده‌ی نمونه نمایش
              داده می‌شود و برنامه قطع نمی‌شود.
            </p>
          </Card>
        </div>
      )}

      {/* دیالوگ‌ها */}
      <TransactionDialog open={txDialog} onClose={() => { setTxDialog(false); setDuplicateSource(null); }} transaction={duplicateSource} />
      <BudgetDialog open={budgetDialog} onClose={() => { setBudgetDialog(false); setEditingBudget(null); }} budget={editingBudget} />
      <AccountDialog open={accountDialog} onClose={() => setAccountDialog(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeTransaction(deleting);
            toast.success('تراکنش حذف شد');
          }
        }}
        title="حذف تراکنش"
        message="این تراکنش حذف شود؟ موجودی کیف پول تغییر نمی‌کند (تنظیم دستی لازم است)."
      />
    </div>
  );
}

/** راهنمای کوچک برای فیلتر تاریخ در جدول */
function JalaliRetry() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" icon="Calendar" onClick={() => setOpen((o) => !o)}>
        راهنمای تاریخ
      </Button>
      {open && (
        <div className="absolute left-0 top-12 z-30 w-64 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-[11px] leading-6 shadow-lifted">
          تراکنش‌های هر ماه شمسی با دکمه‌های «ماه قبل / ماه بعد» بالای صفحه فیلتر می‌شوند. تاریخ ثبت هر تراکنش هم به‌صورت شمسی انتخاب می‌شود.
          <div className="mt-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
