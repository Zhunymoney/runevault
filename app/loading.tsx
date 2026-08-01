export default function Loading() {
  return <main className="mx-auto min-h-[720px] max-w-6xl px-6 py-16" aria-busy="true" aria-label="Loading RuneVault"><div className="animate-pulse space-y-8"><div className="h-4 w-36 rounded bg-amber-300/15" /><div className="h-14 max-w-2xl rounded-2xl bg-white/[.06]" /><div className="h-6 max-w-xl rounded bg-white/[.04]" /><div className="grid gap-5 pt-8 md:grid-cols-3">{[0,1,2].map(item => <div key={item} className="h-56 rounded-3xl border border-white/5 bg-white/[.025]" />)}</div></div><span className="sr-only">Loading RuneVault content</span></main>;
}
