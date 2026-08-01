"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Coins, TrendingUp } from "lucide-react";

function xpForLevel(level: number) {
  let points = 0;
  for (let value = 1; value < level; value++) points += Math.floor(value + 300 * 2 ** (value / 7));
  return Math.floor(points / 4);
}

export default function OsrsToolsPage() {
  const [current, setCurrent] = useState(1); const [target, setTarget] = useState(99);
  const xp = useMemo(() => Math.max(0, xpForLevel(target) - xpForLevel(current)), [current, target]);
  return <main className="mx-auto min-h-[760px] max-w-6xl px-6 py-16"><section className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">OSRS tools</p><h1 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-6xl">Plan the grind. Know the numbers.</h1><p className="mt-5 leading-7 text-white/45">RuneVault tools use the standard OSRS level XP formula. RuneVault marketplace prices are our own buy/sell rates—not Grand Exchange or external market prices.</p></section><section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-3xl border border-white/10 bg-white/[.025] p-7 sm:p-9"><div className="flex items-center gap-3"><Calculator className="text-amber-300" /><h2 className="text-2xl font-black">Skill XP calculator</h2></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-white/50">Current level<input type="number" min={1} max={126} value={current} onChange={event => setCurrent(Math.max(1,Math.min(126,Number(event.target.value)||1)))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-4 text-white" /></label><label className="text-sm font-bold text-white/50">Target level<input type="number" min={1} max={126} value={target} onChange={event => setTarget(Math.max(1,Math.min(126,Number(event.target.value)||1)))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-4 text-white" /></label></div><div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-6"><p className="text-sm text-white/40">XP remaining</p><p className="mt-2 text-4xl font-black text-amber-300">{xp.toLocaleString()}</p>{target <= current && <p className="mt-2 text-sm text-white/45">Choose a target above the current level.</p>}</div></article><aside className="space-y-4"><article className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><Coins className="text-amber-300" /><h2 className="mt-5 text-xl font-black">RuneVault gold prices</h2><p className="mt-3 text-sm leading-6 text-white/40">See current admin-controlled RuneVault buy and sell quotes. These are marketplace rates, not external reference prices.</p><Link href="/quote" className="mt-5 inline-block font-black text-amber-300">Open live quote →</Link></article><article className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><TrendingUp className="text-emerald-300" /><h2 className="mt-5 text-xl font-black">External market references</h2><p className="mt-3 text-sm leading-6 text-white/40">No external data provider is configured, so RuneVault does not display invented GE prices or market statistics.</p></article></aside></section></main>;
}
