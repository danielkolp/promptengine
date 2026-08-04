import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clipboard,
  ClipboardList,
  CornerDownLeft,
  Files,
  Layers3,
  ListChecks,
  MessageSquareText,
  Route,
  RotateCcw,
  Scale,
  ShieldCheck,
  Undo2,
} from 'lucide-react'
import { TAG_CONFIG } from '../utils/promptTemplates'

const breakdownIcons = {
  task: ClipboardList,
  context_files: Files,
  reference: BookOpen,
  success_brief: ListChecks,
  rules: ShieldCheck,
  conversation: MessageSquareText,
  plan: Route,
  alignment: Scale,
}

const variantItems = [
  { key: 'more_concise', label: 'Concise' },
  { key: 'more_detailed', label: 'Detailed' },
  { key: 'more_creative', label: 'Creative' },
]

function normalizeError(error) {
  if (typeof error === 'string') {
    return {
      title: 'Prompt refinement failed',
      message: error,
    }
  }

  return {
    title: error?.title || 'Prompt refinement failed',
    message: error?.message || 'Something went wrong while refining the prompt.',
    details: error?.details,
    status: error?.status,
    code: error?.code,
  }
}

function formatBreakdownLabel(key) {
  return TAG_CONFIG[key]?.label
    || key
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
}

function getBreakdownItems(breakdown = {}) {
  const orderedKeys = Object.keys(TAG_CONFIG)
  const keys = Object.keys(breakdown).sort((a, b) => {
    const aIndex = orderedKeys.indexOf(a)
    const bIndex = orderedKeys.indexOf(b)

    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return keys.map((key) => ({
    key,
    label: formatBreakdownLabel(key),
    Icon: breakdownIcons[key] || Layers3,
    tagClass: TAG_CONFIG[key] ? `tag-${key}` : 'tag-neutral',
  }))
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export default function ResultPanel({ result, loading, onReuse }) {
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const draftRef = useRef(null)

  const source = result?.refined_prompt ?? ''
  const [lastSource, setLastSource] = useState(source)

  // A new refine replaces the draft; edits only survive within one result.
  // Adjusting during render rather than in an effect avoids a second pass.
  if (source !== lastSource) {
    setLastSource(source)
    setDraft(source)
  }

  useEffect(() => {
    if (!draftRef.current) return

    draftRef.current.style.height = 'auto'
    draftRef.current.style.height = `${draftRef.current.scrollHeight}px`
  }, [draft])

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
      <div className="brut-panel animate-panel-in p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="display text-sm text-[var(--volt)]">Refining</span>
          <span className="animate-blink font-bold text-[var(--volt)]">█</span>
        </div>
        <div className="mt-5 space-y-2.5">
          <div className="h-4 w-3/4 bg-white/12" />
          <div className="h-4 w-full bg-white/12" />
          <div className="h-4 w-2/3 bg-white/12" />
        </div>
      </div>
    )
  }

  if (!result) return null

  if (result.error) {
    const error = normalizeError(result.error)

    return (
      <div className="brut-panel animate-panel-in border-[var(--alarm)] p-5 text-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#0a0a0a] bg-[var(--alarm)] text-[#0a0a0a]">
            <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="display text-lg text-[var(--alarm)]">{error.title}</h2>
            <p className="mt-1.5 leading-6 text-white">{error.message}</p>
            {error.details && (
              <p className="brut-slab mt-3 whitespace-pre-wrap p-3 text-xs leading-6 text-[var(--ink-mute)]">
                {error.details}
              </p>
            )}
            {(error.status || error.code) && (
              <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] font-bold uppercase tracking-[0.08em]">
                {error.status && (
                  <span className="border-2 border-[var(--alarm)] px-2 py-1 text-[var(--alarm)]">
                    HTTP {error.status}
                  </span>
                )}
                {error.code && (
                  <span className="border-2 border-[var(--alarm)] px-2 py-1 text-[var(--alarm)]">
                    {error.code}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { breakdown, variants, why_this_works } = result
  const breakdownItems = getBreakdownItems(breakdown)
  const edited = draft !== source

  return (
    <div className="brut-panel animate-panel-in p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="display text-xl text-white sm:text-2xl">Refined prompt</h2>
          {edited && (
            <span className="border-2 border-[var(--volt)] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--volt)]">
              Edited
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {edited && (
            <button
              type="button"
              onClick={() => setDraft(source)}
              className="btn-ghost brut-press inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              <Undo2 className="h-4 w-4" strokeWidth={2.5} />
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={() => onReuse(draft)}
            className="btn-ghost brut-press inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Refine again
          </button>
          <button
            type="button"
            onClick={() => copy(draft)}
            className="btn-volt brut-press inline-flex items-center gap-2 px-4 py-2 text-xs"
          >
            {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clipboard className="h-4 w-4" strokeWidth={2.5} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="brut-slab mt-4 focus-within:border-[var(--volt)]">
        <textarea
          ref={draftRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Refined prompt, editable"
          spellCheck="false"
          className="block min-h-[8rem] w-full resize-none overflow-hidden bg-transparent p-4 text-sm leading-7 text-white focus:outline-none sm:p-5"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.7rem] text-[var(--ink-faint)]">
        <span>Editable — changes are copied and reused as written</span>
        <span>{countWords(draft)} words</span>
      </div>

      <section className="mt-7">
        <div className="eyebrow mb-3 text-white">Breakdown</div>
        <div className="stack">
          {breakdownItems.map(({ key, label, Icon, tagClass }) => (
            <div key={key} className={`${tagClass} stack-bar`}>
              <div className="stack-bar__key" aria-hidden="true" />
              <div className="min-w-0 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className="tag-label h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  <span className="tag-label text-[0.68rem] font-bold uppercase tracking-[0.12em]">
                    {label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-[var(--ink-mute)]">
                  {breakdown[key] || 'Not specified'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="eyebrow mb-3 text-white">Variants</div>
        <div className="grid gap-3 lg:grid-cols-3">
          {variantItems.map(({ key, label }) => {
            const text = variants[key]
            if (!text) return null

            return (
              <div key={key} className="brut-slab flex flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="display text-sm text-white">{label}</h3>
                  <span className="text-[0.68rem] text-[var(--ink-faint)]">
                    {countWords(text)}w
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-6 text-[var(--ink-mute)]">{text}</p>
                <button
                  type="button"
                  onClick={() => setDraft(text)}
                  className="btn-ghost brut-press mt-4 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  <CornerDownLeft className="h-4 w-4" strokeWidth={2.5} />
                  Use this
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {why_this_works.length > 0 && (
        <section className="brut-slab mt-7 p-4">
          <div className="eyebrow mb-3 text-white">Why this works</div>
          <ul className="space-y-2 text-sm leading-6 text-[var(--ink-mute)]">
            {why_this_works.map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--volt)]" strokeWidth={3} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
