'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calcProjections,
  profitAtFillRate,
  DEFAULT_PARAMS,
  type ProjectionParams,
  type ProjectionResult,
} from '@/lib/projections';

type Mode = 'single' | 'compare';

const STORAGE_KEY = 'maningo_projections_state';

interface PersistedState {
  mode: Mode;
  a: ProjectionParams;
  b: ProjectionParams;
}

const SCENARIO_B_DEFAULT: ProjectionParams = { ...DEFAULT_PARAMS, label: 'Scenario B' };

const SCENARIO_COLORS = {
  a: '#c9a96e', // gold
  b: '#2d6a8e', // teal-ink, distinct from gold
};

function fmtCurrency(v: number): string {
  const abs = Math.abs(Math.round(v));
  const s = `$${abs.toLocaleString('en-US')}`;
  return v < 0 ? `−${s}` : s;
}
function fmtPct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}
function fmtDelta(v: number, kind: 'money' | 'pct' | 'count'): string {
  if (Math.abs(v) < 0.0001) return '—';
  if (kind === 'money') return (v > 0 ? '+' : '−') + `$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
  if (kind === 'pct') return (v > 0 ? '+' : '−') + `${Math.abs(v * 100).toFixed(0)} pts`;
  return (v > 0 ? '+' : '−') + Math.abs(Math.round(v)).toString();
}

export function ProjectionsApp() {
  const [mode, setMode] = useState<Mode>('single');
  const [scenarioA, setScenarioA] = useState<ProjectionParams>(DEFAULT_PARAMS);
  const [scenarioB, setScenarioB] = useState<ProjectionParams>(SCENARIO_B_DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.mode === 'single' || parsed.mode === 'compare') setMode(parsed.mode);
        if (parsed.a) setScenarioA({ ...DEFAULT_PARAMS, ...parsed.a });
        if (parsed.b) setScenarioB({ ...SCENARIO_B_DEFAULT, ...parsed.b });
      }
    } catch {
      // Corrupt storage — ignore and use defaults.
    }
    setHydrated(true);
  }, []);

  // Persist any change post-hydration.
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const payload: PersistedState = { mode, a: scenarioA, b: scenarioB };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, mode, scenarioA, scenarioB]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (next === 'compare') {
      // Pre-populate B as a copy of current A so the user starts from a known baseline.
      setScenarioB((prev) => {
        // If B is still untouched default, clone A. Otherwise preserve user's B edits.
        const isUntouchedDefault = JSON.stringify(prev) === JSON.stringify(SCENARIO_B_DEFAULT);
        return isUntouchedDefault ? { ...scenarioA, label: 'Scenario B' } : prev;
      });
      // Relabel A for compare mode if still on the single-mode default label.
      setScenarioA((prev) => (prev.label === 'Current' ? { ...prev, label: 'Scenario A' } : prev));
    } else {
      // Compare → single: keep A as-is, but rename to "Current" if user left it default.
      setScenarioA((prev) => (prev.label === 'Scenario A' ? { ...prev, label: 'Current' } : prev));
    }
    setMode(next);
  }

  const resultA = useMemo(() => calcProjections(scenarioA), [scenarioA]);
  const resultB = useMemo(() => calcProjections(scenarioB), [scenarioB]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
          Projections
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold">Revenue &amp; sustainability planner</h1>
        <p className="text-sm text-muted-foreground">
          What-if calculator for class load, pricing, fill rate, and operating costs. Nothing here writes to the DB.
        </p>
      </div>

      <ModeToggle mode={mode} onChange={switchMode} />

      {mode === 'single' ? (
        <SingleView
          scenario={scenarioA}
          result={resultA}
          onChange={setScenarioA}
          color={SCENARIO_COLORS.a}
        />
      ) : (
        <CompareView
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          resultA={resultA}
          resultB={resultB}
          onChangeA={setScenarioA}
          onChangeB={setScenarioB}
        />
      )}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mb-6 inline-flex rounded-full border border-[#e5e2dc] bg-white p-1">
      {(['single', 'compare'] as Mode[]).map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`min-h-[40px] px-4 sm:px-5 rounded-full text-sm font-medium transition-colors ${
              active ? 'bg-[#2d2d2d] text-white' : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
            }`}
          >
            {m === 'single' ? 'Single view' : 'Compare scenarios'}
          </button>
        );
      })}
    </div>
  );
}

function SingleView({
  scenario,
  result,
  onChange,
  color,
}: {
  scenario: ProjectionParams;
  result: ProjectionResult;
  onChange: (p: ProjectionParams) => void;
  color: string;
}) {
  return (
    <div className="space-y-6">
      <ScenarioForm
        scenario={scenario}
        onChange={onChange}
        showLabelInput={false}
      />
      <SummaryCards result={result} />
      <CalloutBanner result={result} />
      <ProfitChart curves={[{ params: scenario, color, label: scenario.label }]} />
    </div>
  );
}

function CompareView({
  scenarioA,
  scenarioB,
  resultA,
  resultB,
  onChangeA,
  onChangeB,
}: {
  scenarioA: ProjectionParams;
  scenarioB: ProjectionParams;
  resultA: ProjectionResult;
  resultB: ProjectionResult;
  onChangeA: (p: ProjectionParams) => void;
  onChangeB: (p: ProjectionParams) => void;
}) {
  const [collapsedA, setCollapsedA] = useState(false);
  const [collapsedB, setCollapsedB] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyComparison() {
    const text = buildCopyText(scenarioA, resultA, scenarioB, resultB);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        window.prompt('Copy this manually:', text);
      });
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-5">
        <ScenarioColumn
          accent={SCENARIO_COLORS.a}
          scenario={scenarioA}
          result={resultA}
          onChange={onChangeA}
          collapsed={collapsedA}
          onToggle={() => setCollapsedA((c) => !c)}
        />
        <ScenarioColumn
          accent={SCENARIO_COLORS.b}
          scenario={scenarioB}
          result={resultB}
          onChange={onChangeB}
          collapsed={collapsedB}
          onToggle={() => setCollapsedB((c) => !c)}
        />
      </div>

      <ProfitChart
        curves={[
          { params: scenarioA, color: SCENARIO_COLORS.a, label: scenarioA.label },
          { params: scenarioB, color: SCENARIO_COLORS.b, label: scenarioB.label },
        ]}
      />

      <DiffTable
        a={{ label: scenarioA.label, params: scenarioA, result: resultA }}
        b={{ label: scenarioB.label, params: scenarioB, result: resultB }}
      />

      <div>
        <button
          type="button"
          onClick={copyComparison}
          className="min-h-[44px] px-4 rounded-full border border-[#e5e2dc] bg-white text-sm font-medium hover:border-[#c9a96e] transition-colors"
        >
          {copied ? 'Copied to clipboard ✓' : 'Copy comparison'}
        </button>
      </div>
    </div>
  );
}

function ScenarioColumn({
  accent,
  scenario,
  result,
  onChange,
  collapsed,
  onToggle,
}: {
  accent: string;
  scenario: ProjectionParams;
  result: ProjectionResult;
  onChange: (p: ProjectionParams) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={scenario.label}
          onChange={(e) => onChange({ ...scenario, label: e.target.value })}
          className="flex-1 text-lg font-bold border-b-2 bg-transparent outline-none focus:border-[#c9a96e] pb-1"
          style={{ borderBottomColor: accent + '55' }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-[#c9a96e] hover:underline"
        >
          {collapsed ? 'Edit parameters' : 'Hide parameters'}
        </button>
      </div>

      {!collapsed && <ScenarioForm scenario={scenario} onChange={onChange} showLabelInput={false} compact />}

      <SummaryCards result={result} compact />
      <CalloutBanner result={result} />
    </div>
  );
}

function ScenarioForm({
  scenario,
  onChange,
  showLabelInput,
  compact = false,
}: {
  scenario: ProjectionParams;
  onChange: (p: ProjectionParams) => void;
  showLabelInput: boolean;
  compact?: boolean;
}) {
  function set<K extends keyof ProjectionParams>(key: K, value: ProjectionParams[K]) {
    onChange({ ...scenario, [key]: value });
  }
  return (
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
      <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Classes &amp; pricing</p>
        {showLabelInput && (
          <TextField label="Scenario label" value={scenario.label} onChange={(v) => set('label', v)} />
        )}
        <NumberField label="Classes per week" value={scenario.classesPerWeek} min={1} max={30} step={1} onChange={(v) => set('classesPerWeek', v)} />
        <NumberField label="Max seats per class" value={scenario.maxSeats} min={5} max={30} step={1} onChange={(v) => set('maxSeats', v)} />
        <PercentField label="Average fill rate" value={scenario.fillRate} min={0.1} max={1} step={0.05} onChange={(v) => set('fillRate', v)} />
        <NumberField label="Avg visits / member / week" value={scenario.avgVisitsPerMember} min={1} max={5} step={0.1} onChange={(v) => set('avgVisitsPerMember', v)} />
        <CurrencyField label="Price per class" value={scenario.pricePerClass} min={5} max={100} step={1} onChange={(v) => set('pricePerClass', v)} />
        <PercentField
          label="Pack discount (informational)"
          value={scenario.packDiscount}
          min={0}
          max={0.5}
          step={0.05}
          onChange={(v) => set('packDiscount', v)}
          hint="Used only as a note; current revenue calc still uses price per class."
        />
      </div>

      <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Monthly expenses</p>
        <CurrencyField label="Space / venue" value={scenario.venue} min={0} max={10000} step={50} onChange={(v) => set('venue', v)} />
        <PercentField label="Payment processing" value={scenario.processing} min={0.01} max={0.05} step={0.005} onChange={(v) => set('processing', v)} />
        <CurrencyField label="Booking platform" value={scenario.bookingPlatform} min={0} max={500} step={5} onChange={(v) => set('bookingPlatform', v)} />
        <CurrencyField label="Insurance + licensing" value={scenario.insurance} min={0} max={1000} step={10} onChange={(v) => set('insurance', v)} />
        <CurrencyField label="Marketing" value={scenario.marketing} min={0} max={2000} step={25} onChange={(v) => set('marketing', v)} />
        <CurrencyField label="Instructor pay" value={scenario.instructor} min={0} max={10000} step={50} onChange={(v) => set('instructor', v)} />
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <TextField label="Other expenses (label)" value={scenario.otherLabel} onChange={(v) => set('otherLabel', v)} />
          <CurrencyField label={' '} value={scenario.other} min={0} max={5000} step={25} onChange={(v) => set('other', v)} />
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ result, compact = false }: { result: ProjectionResult; compact?: boolean }) {
  const profitTone = result.monthlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700';
  return (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-5'} gap-3`}>
      <Card title="Gross revenue" emoji="💰" value={fmtCurrency(result.grossRevenue)} sub={`Net ${fmtCurrency(result.netRevenue)} after processing`} />
      <Card title="Total expenses" emoji="📉" value={fmtCurrency(result.totalExpenses)} sub={`${fmtCurrency(result.fixedExpenses)} fixed + ${fmtCurrency(result.processingFee)} fees`} />
      <Card title="Monthly profit" emoji={result.monthlyProfit >= 0 ? '✅' : '⚠️'} value={fmtCurrency(result.monthlyProfit)} valueClassName={profitTone} sub={`Margin ${fmtPct(result.profitMargin)}`} />
      <Card title="Members needed" emoji="👥" value={Math.round(result.membersNeeded).toLocaleString('en-US')} sub="Active members to sustain this schedule" />
      <Card title="Break-even fill" emoji="📊" value={result.breakEvenFillRate === null ? '—' : fmtPct(Math.min(1, Math.max(0, result.breakEvenFillRate)))} sub={result.breakEvenFillRate !== null && result.breakEvenFillRate > 1 ? 'Over 100% — unattainable at current pricing' : 'Of seats sold to break even'} />
    </div>
  );
}

function Card({
  title,
  emoji,
  value,
  sub,
  valueClassName = '',
}: {
  title: string;
  emoji: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider text-[#6b6b6b] font-medium">
        <span className="mr-1" aria-hidden>
          {emoji}
        </span>
        {title}
      </p>
      <p className={`text-xl font-bold mt-1 ${valueClassName}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CalloutBanner({ result }: { result: ProjectionResult }) {
  const positive = result.monthlyProfit >= 0;
  const tone = positive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      {positive ? (
        <>
          ~{fmtCurrency(result.monthlyProfit)}/month margin at this schedule.
          {result.breakEvenFillRate !== null &&
            ` Break-even at ${fmtPct(Math.min(1, Math.max(0, result.breakEvenFillRate)))} fill.`}
        </>
      ) : (
        <>Operating at a loss of {fmtCurrency(Math.abs(result.monthlyProfit))}/month at this schedule.</>
      )}
    </div>
  );
}

function DiffTable({
  a,
  b,
}: {
  a: { label: string; params: ProjectionParams; result: ProjectionResult };
  b: { label: string; params: ProjectionParams; result: ProjectionResult };
}) {
  const rows: Array<{
    metric: string;
    av: string;
    bv: string;
    delta: number;
    kind: 'money' | 'pct' | 'count';
    higherIsBetter: boolean;
  }> = [
    { metric: 'Gross revenue', av: fmtCurrency(a.result.grossRevenue), bv: fmtCurrency(b.result.grossRevenue), delta: b.result.grossRevenue - a.result.grossRevenue, kind: 'money', higherIsBetter: true },
    { metric: 'Total expenses', av: fmtCurrency(a.result.totalExpenses), bv: fmtCurrency(b.result.totalExpenses), delta: b.result.totalExpenses - a.result.totalExpenses, kind: 'money', higherIsBetter: false },
    { metric: 'Monthly profit', av: fmtCurrency(a.result.monthlyProfit), bv: fmtCurrency(b.result.monthlyProfit), delta: b.result.monthlyProfit - a.result.monthlyProfit, kind: 'money', higherIsBetter: true },
    { metric: 'Members needed', av: Math.round(a.result.membersNeeded).toString(), bv: Math.round(b.result.membersNeeded).toString(), delta: b.result.membersNeeded - a.result.membersNeeded, kind: 'count', higherIsBetter: false },
    { metric: 'Break-even fill', av: a.result.breakEvenFillRate === null ? '—' : fmtPct(Math.min(1, Math.max(0, a.result.breakEvenFillRate))), bv: b.result.breakEvenFillRate === null ? '—' : fmtPct(Math.min(1, Math.max(0, b.result.breakEvenFillRate))), delta: (b.result.breakEvenFillRate || 0) - (a.result.breakEvenFillRate || 0), kind: 'pct', higherIsBetter: false },
    { metric: 'Profit margin', av: fmtPct(a.result.profitMargin), bv: fmtPct(b.result.profitMargin), delta: b.result.profitMargin - a.result.profitMargin, kind: 'pct', higherIsBetter: true },
  ];

  const profitDelta = b.result.monthlyProfit - a.result.monthlyProfit;
  const membersDelta = b.result.membersNeeded - a.result.membersNeeded;
  const summary = (() => {
    if (Math.abs(profitDelta) < 1) return `${b.label} produces about the same monthly profit as ${a.label}.`;
    const more = profitDelta > 0;
    const moreLess = more ? 'more' : 'less';
    const membersClause =
      Math.abs(membersDelta) < 1
        ? 'with no change in active members needed'
        : `${membersDelta > 0 ? 'requires ' : 'needs '}${Math.abs(Math.round(membersDelta))} ${membersDelta > 0 ? 'additional' : 'fewer'} active members`;
    return `${b.label} generates ${fmtCurrency(Math.abs(profitDelta))} ${moreLess} profit per month than ${a.label} and ${membersClause}.`;
  })();

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
      <div className="p-4 border-b border-[#e5e2dc]">
        <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Side-by-side</p>
        <h3 className="text-lg font-bold">{a.label} vs {b.label}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#faf9f6] text-[11px] uppercase tracking-wider text-[#6b6b6b]">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Metric</th>
              <th className="px-4 py-2 text-right font-medium">{a.label}</th>
              <th className="px-4 py-2 text-right font-medium">{b.label}</th>
              <th className="px-4 py-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const equal = Math.abs(r.delta) < (r.kind === 'pct' ? 0.001 : 0.5);
              const better = !equal && (r.higherIsBetter ? r.delta > 0 : r.delta < 0);
              const tone = equal ? 'text-[#6b6b6b]' : better ? 'text-emerald-700' : 'text-red-700';
              return (
                <tr key={r.metric} className="border-t border-[#f3f1ed]">
                  <td className="px-4 py-2">{r.metric}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.av}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.bv}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${tone}`}>
                    {equal ? '—' : fmtDelta(r.delta, r.kind)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-sm border-t border-[#e5e2dc] bg-[#faf9f6]">{summary}</p>
    </div>
  );
}

function buildCopyText(
  paramsA: ProjectionParams,
  resA: ProjectionResult,
  paramsB: ProjectionParams,
  resB: ProjectionResult,
): string {
  const lines: string[] = [];
  lines.push(`Maningo Method — projections comparison`);
  lines.push('');
  for (const [params, res] of [
    [paramsA, resA],
    [paramsB, resB],
  ] as Array<[ProjectionParams, ProjectionResult]>) {
    lines.push(`### ${params.label}`);
    lines.push(`  Classes / week:     ${params.classesPerWeek}`);
    lines.push(`  Max seats / class:  ${params.maxSeats}`);
    lines.push(`  Fill rate:          ${fmtPct(params.fillRate)}`);
    lines.push(`  Price per class:    $${params.pricePerClass}`);
    lines.push(`  Gross revenue:      ${fmtCurrency(res.grossRevenue)}/mo`);
    lines.push(`  Total expenses:     ${fmtCurrency(res.totalExpenses)}/mo`);
    lines.push(`  Monthly profit:     ${fmtCurrency(res.monthlyProfit)}/mo`);
    lines.push(`  Profit margin:      ${fmtPct(res.profitMargin)}`);
    lines.push(`  Members needed:     ${Math.round(res.membersNeeded)}`);
    lines.push(`  Break-even fill:    ${res.breakEvenFillRate === null ? '—' : fmtPct(Math.min(1, Math.max(0, res.breakEvenFillRate)))}`);
    lines.push('');
  }
  const profitDelta = resB.monthlyProfit - resA.monthlyProfit;
  lines.push(`Δ Monthly profit (${paramsB.label} - ${paramsA.label}): ${fmtDelta(profitDelta, 'money')}/mo`);
  return lines.join('\n');
}

// --- Inline SVG profit chart --------------------------------------------------

interface Curve {
  params: ProjectionParams;
  color: string;
  label: string;
}

function ProfitChart({ curves }: { curves: Curve[] }) {
  // Sample fill rates from 10% → 100% in 5% steps; smoothest visual curve.
  const samples = useMemo(() => {
    const xs: number[] = [];
    for (let i = 10; i <= 100; i += 5) xs.push(i / 100);
    return xs;
  }, []);

  // Compute series & shared y domain.
  const series = curves.map((c) => ({
    ...c,
    points: samples.map((x) => ({ x, y: profitAtFillRate(c.params, x) })),
  }));

  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  let yMin = Math.min(0, ...allY);
  let yMax = Math.max(0, ...allY);
  if (yMin === yMax) yMax = yMin + 1; // avoid div-by-zero
  // Pad ~8% so curve doesn't kiss the edge.
  const pad = (yMax - yMin) * 0.08;
  yMin -= pad;
  yMax += pad;

  // Viewbox math.
  const W = 720;
  const H = 280;
  const PAD_L = 64;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xToPx = (x: number) => PAD_L + ((x - 0.1) / (1.0 - 0.1)) * innerW;
  const yToPx = (y: number) => PAD_T + (1 - (y - yMin) / (yMax - yMin)) * innerH;

  const zeroY = yToPx(0);

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Monthly profit by fill rate</p>
          <p className="text-sm text-muted-foreground">Hold all other parameters constant; sweep fill rate from 10% → 100%.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-1.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-[#2d2d2d]">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full" preserveAspectRatio="xMidYMid meet">
          {/* axes background */}
          <rect x={PAD_L} y={PAD_T} width={innerW} height={innerH} fill="#faf9f6" />
          {/* gridlines */}
          {[0.1, 0.25, 0.5, 0.75, 1.0].map((g) => (
            <g key={g}>
              <line x1={xToPx(g)} x2={xToPx(g)} y1={PAD_T} y2={PAD_T + innerH} stroke="#e5e2dc" strokeWidth={1} />
              <text x={xToPx(g)} y={PAD_T + innerH + 18} fontSize={11} fill="#6b6b6b" textAnchor="middle">
                {Math.round(g * 100)}%
              </text>
            </g>
          ))}
          {/* y-axis: 4 ticks */}
          {[0, 0.33, 0.66, 1].map((t) => {
            const y = yMin + (yMax - yMin) * (1 - t);
            return (
              <g key={t}>
                <line x1={PAD_L} x2={PAD_L + innerW} y1={yToPx(y)} y2={yToPx(y)} stroke="#e5e2dc" strokeWidth={1} />
                <text x={PAD_L - 8} y={yToPx(y) + 4} fontSize={11} fill="#6b6b6b" textAnchor="end">
                  {fmtCurrency(y)}
                </text>
              </g>
            );
          })}
          {/* zero line — emphasized */}
          {zeroY >= PAD_T && zeroY <= PAD_T + innerH && (
            <line x1={PAD_L} x2={PAD_L + innerW} y1={zeroY} y2={zeroY} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" />
          )}
          {/* curves */}
          {series.map((s) => {
            const d = s.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(p.x).toFixed(1)} ${yToPx(p.y).toFixed(1)}`)
              .join(' ');
            return (
              <g key={s.label}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {/* current fill rate marker */}
                <line
                  x1={xToPx(s.params.fillRate)}
                  x2={xToPx(s.params.fillRate)}
                  y1={PAD_T}
                  y2={PAD_T + innerH}
                  stroke={s.color}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <circle cx={xToPx(s.params.fillRate)} cy={yToPx(profitAtFillRate(s.params, s.params.fillRate))} r={5} fill={s.color} stroke="#fff" strokeWidth={2} />
              </g>
            );
          })}
          <text x={PAD_L + innerW / 2} y={H - 6} fontSize={11} fill="#6b6b6b" textAnchor="middle">
            Fill rate
          </text>
        </svg>
      </div>
    </div>
  );
}

// --- Form field primitives ----------------------------------------------------

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full h-10 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
      />
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </label>
  );
}

function CurrencyField(props: Omit<Parameters<typeof NumberField>[0], 'label'> & { label: string }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1">{props.label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b6b6b]">$</span>
        <input
          type="number"
          value={Number.isFinite(props.value) ? props.value : ''}
          min={props.min}
          max={props.max}
          step={props.step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            props.onChange(Number.isFinite(n) ? n : 0);
          }}
          className="w-full h-10 pl-7 pr-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
        />
      </div>
      {props.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{props.hint}</p>}
    </label>
  );
}

function PercentField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  // value is stored 0..1 but displayed 0..100.
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={Math.round(value * 1000) / 10}
          min={Math.round(min * 100)}
          max={Math.round(max * 100)}
          step={Math.round(step * 100)}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n / 100 : 0);
          }}
          className="w-full h-10 pl-3 pr-8 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6b6b6b]">%</span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
      />
    </label>
  );
}
