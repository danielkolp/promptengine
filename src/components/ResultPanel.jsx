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
  const [copied, setCopied] = useState(false)
  const draftRef = useRef(null)

  const source = result?.refined_prompt ?? ''
  // Both seeded from the same value. Starting the draft empty while lastSource
  // already held the prompt left the two in sync on a mount that arrived with a
  // result, so the sync below never ran: empty box, and an Edited badge for an
  // edit nobody made.
  const [draft, setDraft] = useState(source)
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
          <span className="eyebrow text-[var(--volt)]">Refining</span>
          <span className="mono animate-blink font-bold text-[var(--volt)]">█</span>
        </div>
        <div className="mt-5 space-y-2.5">
          <div className="h-4 w-3/4 bg-[var(--edge-soft)]" />
          <div className="h-4 w-full bg-[var(--edge-soft)]" />
          <div className="h-4 w-2/3 bg-[var(--edge-soft)]" />
        </div>
      </div>
    )
  }

  if (!result) return null

  if (result.error) {
    const error = normalizeError(result.error)

    return (
      <div className="brut-panel animate-panel-in t-body border-[var(--alarm)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--alarm)] text-[#0a0a0a]">
            <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="title-sm text-[var(--alarm)]">{error.title}</h2>
            <p className="mt-1.5 leading-7 text-[var(--ink)]">{error.message}</p>
            {error.details && (
              <p className="mono brut-slab t-micro mt-3 whitespace-pre-wrap p-3 leading-6 text-[var(--ink-mute)]">
                {error.details}
              </p>
            )}
            {(error.status || error.code) && (
              <div className="t-micro mt-3 flex flex-wrap gap-2 font-semibold uppercase tracking-[0.1em]">
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
    <div className="brut-panel animate-panel-in p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="display text-xl text-[var(--ink)] sm:text-2xl">Refined prompt</h2>
          {/*
            A state, not an action. The Revert button sitting next to it is the
            thing to reach for, so the badge only has to be readable.
          */}
          {edited && (
            <span className="t-micro border-2 border-[var(--edge-soft)] px-2 py-1 font-semibold uppercase tracking-[0.1em] text-[var(--ink-mute)]">
              Edited
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {edited && (
            <button
              type="button"
              onClick={() => setDraft(source)}
              className="btn-ghost brut-press t-small inline-flex items-center gap-2 px-3 py-2"
            >
              <Undo2 className="h-4 w-4" strokeWidth={2.25} />
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={() => onReuse(draft)}
            className="btn-ghost brut-press t-small inline-flex items-center gap-2 px-3 py-2"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            Refine again
          </button>
          <button
            type="button"
            onClick={() => copy(draft)}
            className="btn-volt brut-press t-small inline-flex items-center gap-2 px-4 py-2"
          >
            {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clipboard className="h-4 w-4" strokeWidth={2.5} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="brut-slab mt-5 focus-within:border-[var(--volt)]">
        <textarea
          ref={draftRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Refined prompt, editable"
          spellCheck="false"
          className="mono t-small block min-h-[8rem] w-full resize-none overflow-hidden bg-transparent p-4 leading-7 text-[var(--ink)] focus:outline-none sm:p-5"
        />
      </div>

      {/*
        The sentence that used to sit here explained that a textarea can be
        typed into and that Copy copies what it holds. The count is the only
        part that told the reader something the controls didn't.
      */}
      <div className="t-small mt-2.5 text-right text-[var(--ink-faint)]">
        {countWords(draft)} words
      </div>

      <section className="mt-9">
        <div className="eyebrow mb-4 text-[var(--ink-mute)]">Breakdown</div>
        <div className="stack">
          {breakdownItems.map(({ key, label, Icon, tagClass }) => {
            const value = breakdown[key]

            return (
              <div
                key={key}
                className={`${tagClass} stack-row${value ? '' : ' stack-row--empty'}`}
              >
                <div className="stack-row__key" aria-hidden="true">
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="grid min-w-0 gap-x-5 gap-y-1 px-4 py-3.5 sm:grid-cols-[8.5rem_1fr] sm:items-baseline">
                  <span className="tag-label t-micro font-semibold uppercase tracking-[0.12em]">
                    {label}
                  </span>
                  <p className="stack-row__value t-body min-w-0 leading-7">
                    {value || 'Not specified'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-9">
        <div className="eyebrow mb-4 text-[var(--ink-mute)]">Variants</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {variantItems.map(({ key, label }) => {
            const text = variants[key]
            if (!text) return null

            return (
              <div key={key} className="brut-slab flex flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="title-sm text-[var(--ink)]">{label}</h3>
                  <span className="mono t-micro text-[var(--ink-faint)]">
                    {countWords(text)}w
                  </span>
                </div>
                <p className="t-small mt-3 flex-1 leading-7 text-[var(--ink-mute)]">{text}</p>
                <button
                  type="button"
                  onClick={() => setDraft(text)}
                  className="btn-ghost brut-press t-small mt-5 inline-flex items-center justify-center gap-2 px-3 py-2"
                >
                  <CornerDownLeft className="h-4 w-4" strokeWidth={2.25} />
                  Use this
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/*
        These were volt ticks. Up to eight of them put more saturated marks in
        a closing footnote than the page gives its primary action — and a tick
        claims each line was verified, which is not what a rationale is. A
        square is a marker; it doesn't assert anything.
      */}
      {why_this_works.length > 0 && (
        <section className="brut-slab mt-9 p-5">
          <div className="eyebrow mb-4 text-[var(--ink-mute)]">Why this works</div>
          <ul className="t-body space-y-2.5 leading-7 text-[var(--ink-mute)]">
            {why_this_works.map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-3 h-1.5 w-1.5 shrink-0 bg-[var(--ink-faint)]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
