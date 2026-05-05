import { useState } from 'react'
import {
  Check,
  Clipboard,
  Layers3,
  ListChecks,
  Palette,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  Zap,
} from 'lucide-react'

const breakdownItems = [
  { key: 'goal', label: 'Goal', icon: Target },
  { key: 'constraints', label: 'Constraints', icon: ShieldCheck },
  { key: 'output_format', label: 'Output Format', icon: ListChecks },
  { key: 'style', label: 'Style', icon: Palette },
]

const variantItems = [
  { key: 'more_concise', label: 'More concise' },
  { key: 'more_detailed', label: 'More detailed' },
  { key: 'more_creative', label: 'More creative' },
]

export default function ResultPanel({ result, loading }) {
  const [copied, setCopied] = useState(false)

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.warn('Copy failed', e)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel animate-panel-in rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3 text-slate-300">
          <Zap className="h-5 w-5 text-violet-300" />
          <span className="text-sm font-semibold">Refining prompt</span>
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    )
  }

  if (!result) return null

  if (result.error) {
    return (
      <div className="rounded-3xl border border-red-400/25 bg-red-950/30 p-5 text-sm text-red-100">
        {result.error}
      </div>
    )
  }

  const { refined_prompt, breakdown, variants, why_this_works } = result

  return (
    <div className="glass-panel animate-panel-in rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Refined Prompt</h2>
            <p className="text-sm text-slate-500">Ready to copy or adapt.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => copy(refined_prompt)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-violet-300/30 hover:bg-white/[0.09] hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100 sm:p-5">
        <p className="whitespace-pre-wrap">{refined_prompt}</p>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Layers3 className="h-4 w-4 text-sky-300" />
          Breakdown
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {breakdownItems.map(({ key, label, icon: Icon }) => (
            <div key={key} className={`tag-${key} rounded-2xl border border-white/10 bg-white/[0.03] p-4`}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className="tag-label h-4 w-4" />
                <span className="tag-label text-sm font-semibold">{label}</span>
              </div>
              <p className="text-sm leading-6 text-slate-300">{breakdown[key] || 'Not specified'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <WandSparkles className="h-4 w-4 text-violet-300" />
          Variants
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {variantItems.map(({ key, label }) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">{label}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{variants[key]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Check className="h-4 w-4 text-emerald-300" />
          Why This Works
        </div>
        <ul className="space-y-2 text-sm leading-6 text-slate-300">
          {why_this_works.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
