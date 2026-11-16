import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronDown, Info, OctagonAlert, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import type { Provenance } from '../data/types';
import type { Warning } from '../lib/recommend';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Chip({
  active,
  onClick,
  children,
  disabled,
  title,
  tone,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  tone?: 'warn';
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium tnum transition-colors',
        active
          ? 'border-accent bg-accent text-accent-ink'
          : tone === 'warn'
            ? 'border-caution/50 bg-surface text-caution'
            : 'border-line bg-surface text-fg hover:border-line-strong',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );
}

export function OptionCard({
  icon: Icon,
  label,
  sub,
  active,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  sub?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'flex min-h-[78px] flex-col items-start justify-between gap-1.5 rounded-xl border p-3 text-left transition-colors',
        active ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-line-strong active:bg-raise',
      )}
    >
      {Icon && <Icon size={20} strokeWidth={1.75} className={active ? 'text-accent' : 'text-muted'} aria-hidden />}
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </button>
  );
}

export function Disclosure({
  title,
  icon: Icon,
  children,
  defaultOpen,
  badge,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-3 py-3 text-left"
      >
        {Icon && <Icon size={18} className="shrink-0 text-muted" aria-hidden />}
        <span className="flex-1 text-[15px] font-semibold">{title}</span>
        {badge}
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={id} className="pb-4 text-[15px] leading-relaxed text-fg/90">
          {children}
        </div>
      )}
    </section>
  );
}

const PROV: Record<Provenance, { label: string; cls: string; title: string }> = {
  verified: { label: 'spec', cls: 'text-ok border-ok/40', title: 'Published specification' },
  calculated: { label: 'calc', cls: 'text-accent border-accent/40', title: 'Calculated from your inputs' },
  estimate: { label: 'start', cls: 'text-muted border-line-strong', title: 'Recommended starting point' },
  assumption: { label: 'assumed', cls: 'text-caution border-caution/50', title: 'Assumption: could not be verified' },
  user: { label: 'you', cls: 'text-user border-user/40', title: 'Your value' },
};

export function ProvBadge({ p }: { p: Provenance }) {
  const v = PROV[p];
  return (
    <span title={v.title} className={cx('rounded border px-1 py-px text-[10px] font-semibold uppercase tracking-wider', v.cls)}>
      {v.label}
    </span>
  );
}

const DOT: Record<Provenance, string> = {
  verified: 'bg-ok',
  calculated: 'bg-accent',
  estimate: 'bg-muted',
  assumption: 'bg-caution',
  user: 'bg-user',
};

/** Compact provenance marker for tight spaces (paired with DotLegend). */
export function ProvDot({ p }: { p: Provenance }) {
  return <span title={PROV[p].title} aria-label={PROV[p].title} role="img" className={cx('inline-block size-2 shrink-0 rounded-full', DOT[p])} />;
}

export function DotLegend() {
  const items: [Provenance, string][] = [
    ['verified', 'spec'],
    ['calculated', 'calculated'],
    ['estimate', 'starting point'],
    ['user', 'yours'],
    ['assumption', 'assumed'],
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      {items.map(([p, l]) => (
        <span key={p} className="flex items-center gap-1.5">
          <ProvDot p={p} /> {l}
        </span>
      ))}
    </div>
  );
}

export function ProvLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
      {(Object.keys(PROV) as Provenance[]).map((p) => (
        <span key={p} className="flex items-center gap-1.5">
          <ProvBadge p={p} /> {PROV[p].title}
        </span>
      ))}
    </div>
  );
}

const W_STYLE = {
  critical: { icon: OctagonAlert, cls: 'border-critical/50 bg-critical/10 text-fg', ic: 'text-critical' },
  caution: { icon: TriangleAlert, cls: 'border-caution/40 bg-caution/10 text-fg', ic: 'text-caution' },
  info: { icon: Info, cls: 'border-info/30 bg-info/5 text-fg/90', ic: 'text-info' },
};

export function WarningItem({ w }: { w: Warning }) {
  const s = W_STYLE[w.level];
  const I = s.icon;
  return (
    <li className={cx('flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-snug', s.cls)} role={w.level === 'critical' ? 'alert' : undefined}>
      <I size={16} className={cx('mt-0.5 shrink-0', s.ic)} aria-hidden />
      <span>{w.text}</span>
    </li>
  );
}

export function WarningList({ warnings }: { warnings: Warning[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {warnings.map((w) => (
        <WarningItem key={w.text} w={w} />
      ))}
    </ul>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl">
        <div className="safe-x flex min-h-14 items-center gap-3 border-b border-line">
          <h2 className="flex-1 font-display text-xl font-semibold tracking-wide">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>
        <div className="safe-x safe-bottom overflow-y-auto overscroll-contain py-4">{children}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-9 flex-1 rounded-full px-3 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children, hint, right }: { children: ReactNode; hint?: string; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {children}
        {hint && <span className="ml-2 normal-case tracking-normal text-dim">{hint}</span>}
      </span>
      {right}
    </div>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">{children}</div>;
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-display text-sm font-semibold text-accent tnum">
            {i + 1}
          </span>
          <span className="pt-0.5">{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  placeholder,
  label,
}: {
  id: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  label: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setText(value === undefined ? '' : String(+value.toFixed(3)));
  }, [value]);
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          aria-label={label}
          inputMode="decimal"
          className="min-h-11 w-28 rounded-lg border border-line bg-bg px-3 text-base tnum outline-none focus:border-accent"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.');
            setText(t);
            if (t.trim() === '') {
              setErr(null);
              onChange(undefined);
              return;
            }
            const v = Number(t);
            if (!Number.isFinite(v)) return setErr('Enter a number');
            if (v < min || v > max) return setErr(`Between ${min} and ${max}`);
            setErr(null);
            onChange(step ? Math.round(v / step) * step : v);
          }}
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
      {err && <p className="mt-1 text-xs text-critical">{err}</p>}
    </div>
  );
}
