'use client';

import { useState } from 'react';

// ── Simulated analytics data (replace with API calls as needed) ─────────────
const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

const salaryData  = [285_000_000, 291_000_000, 287_000_000, 305_000_000, 312_000_000, 298_000_000, 318_500_000];
const overtimeData = [18_500_000,  21_000_000,  16_800_000,  25_400_000,  31_200_000,  19_700_000,  22_800_000];
const headcount   = [124, 126, 125, 128, 130, 131, 133];

const deptCost = [
  { dept: 'Engineering',  value: 118_000_000, color: '#3B82F6' },
  { dept: 'Sales',        value:  72_000_000, color: '#10B981' },
  { dept: 'Operations',   value:  64_500_000, color: '#F59E0B' },
  { dept: 'HR & Admin',   value:  38_200_000, color: '#8B5CF6' },
  { dept: 'Finance',      value:  25_800_000, color: '#EF4444' },
];

const fmt = (n: number) =>
  n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)}jt`
    : `Rp ${n.toLocaleString('id-ID')}`;

const pct = (val: number, arr: number[]) =>
  ((val / Math.max(...arr)) * 100).toFixed(1);

// ── KPI cards ────────────────────────────────────────────────────────────────
const kpis = [
  { label: 'Total Payroll (Feb)', value: 'Rp 318,5jt', delta: '+6.9%', up: true,   color: '#3B82F6' },
  { label: 'Total Headcount',     value: '133 orang',  delta: '+2 MoM', up: true,  color: '#10B981' },
  { label: 'Overtime Cost',       value: 'Rp 22,8jt',  delta: '-26.9%', up: false, color: '#F59E0B' },
  { label: 'Cost per Employee',   value: 'Rp 2,4jt',   delta: '+4.5%',  up: true,  color: '#8B5CF6' },
];

export default function AnalyticsPage() {
  const [activeMonth, setActiveMonth] = useState(6); // Feb (last item)

  return (
    <main className="min-h-screen bg-[#0A0F1E] text-white p-8 font-sans">
      {/* Header */}
      <div className="mb-10">
        <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-1">Executive Dashboard</p>
        <h1 className="text-3xl font-bold text-white">HR Cost Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm">Real-time monitoring of payroll, headcount, and operational costs.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl p-5 border border-white/5 bg-white/[0.03] backdrop-blur"
            style={{ boxShadow: `0 0 30px ${k.color}18` }}
          >
            <p className="text-slate-400 text-xs mb-3 font-medium">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <span
              className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                k.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Salary Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl p-6 border border-white/5 bg-white/[0.03]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg">Salary vs Overtime Trend</h2>
            <span className="text-xs text-slate-400">7 months view</span>
          </div>
          <div className="flex items-end gap-3 h-48">
            {MONTHS.map((m, i) => (
              <div
                key={m}
                className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                onClick={() => setActiveMonth(i)}
              >
                {/* Overtime bar (stacked on top) */}
                <div
                  className="w-full rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${(overtimeData[i] / 35_000_000) * 40}px`,
                    background: i === activeMonth ? '#F59E0B' : '#F59E0B44',
                  }}
                />
                {/* Salary bar */}
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: `${(salaryData[i] / 320_000_000) * 130}px`,
                    background:
                      i === activeMonth
                        ? 'linear-gradient(to top, #2563EB, #3B82F6)'
                        : '#3B82F644',
                  }}
                />
                <span className="text-[10px] text-slate-500 mt-1">{m}</span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-5 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Salary</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />Overtime</span>
          </div>
          {/* Selected month breakdown */}
          <div className="mt-5 pt-5 border-t border-white/5 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Salary</p>
              <p className="font-bold text-blue-400">{fmt(salaryData[activeMonth])}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Overtime</p>
              <p className="font-bold text-amber-400">{fmt(overtimeData[activeMonth])}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Headcount</p>
              <p className="font-bold text-purple-400">{headcount[activeMonth]} org</p>
            </div>
          </div>
        </div>

        {/* Dept Cost Breakdown */}
        <div className="rounded-2xl p-6 border border-white/5 bg-white/[0.03]">
          <h2 className="font-bold text-lg mb-6">Cost by Department</h2>
          <div className="space-y-4">
            {deptCost.map((d) => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">{d.dept}</span>
                  <span style={{ color: d.color }} className="font-semibold">{fmt(d.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct(d.value, deptCost.map(x => x.value))}%`, background: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-slate-400 text-xs">Total Dept Cost</p>
            <p className="text-xl font-bold text-white mt-1">
              {fmt(deptCost.reduce((s, d) => s + d.value, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Headcount Table */}
      <div className="rounded-2xl p-6 border border-white/5 bg-white/[0.03]">
        <h2 className="font-bold text-lg mb-5">Monthly Headcount Growth</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="pb-3 text-left">Month</th>
                {MONTHS.map(m => <th key={m} className="pb-3 text-center">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 text-slate-300 font-medium">Headcount</td>
                {headcount.map((h, i) => (
                  <td key={i} className="py-3 text-center font-bold" style={{ color: i === activeMonth ? '#3B82F6' : '#94A3B8' }}>{h}</td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 text-slate-300 font-medium">Gaji (juta)</td>
                {salaryData.map((s, i) => (
                  <td key={i} className="py-3 text-center" style={{ color: i === activeMonth ? '#3B82F6' : '#94A3B8' }}>
                    {(s / 1_000_000).toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 text-slate-300 font-medium">Lembur (juta)</td>
                {overtimeData.map((o, i) => (
                  <td key={i} className="py-3 text-center" style={{ color: i === activeMonth ? '#F59E0B' : '#94A3B8' }}>
                    {(o / 1_000_000).toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
