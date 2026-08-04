import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgePlus,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import SuggestionDropdown from './SuggestionDropdown'
import FlowPipe from './FlowPipe'
import {
  createDefaultTags,
  createTag,
  STARTER_PACKS,
  SUGGESTIONS,
  TAG_CONFIG,
  TARGET_MODELS,
  createTagsFromPack,
} from '../utils/promptTemplates'

function resizeTextarea(node) {
  if (!node) return

  node.style.height = 'auto'
  node.style.height = `${node.scrollHeight}px`
}

function CustomTooltip({ id, text, placement = 'top' }) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`custom-tooltip ${placement === 'bottom' ? 'custom-tooltip--bottom' : ''}`}
    >
      {text}
    </span>
  )
}

export default function PromptInput({
  tags,
  setTags,
  freeText,
  setFreeText,
  targetModel,
  setTargetModel,
  onRefine,
  loading,
  showSuggestions,
  setShowSuggestions,
}) {
  const tagRefs = useRef({})
  const tileRefs = useRef({})
  const freeTextRef = useRef(null)
  const panelRef = useRef(null)
  const promptBoxRef = useRef(null)
  const [pulseId, setPulseId] = useState(0)

  const quickTagKeys = Object.keys(TAG_CONFIG)
  const activeTarget = TARGET_MODELS.find((item) => item.key === targetModel) ?? TARGET_MODELS[0]

  useLayoutEffect(() => {
    Object.values(tagRefs.current).forEach(resizeTextarea)
  }, [tags])

  const focusTag = (id) => {
    window.requestAnimationFrame(() => tagRefs.current[id]?.focus())
  }

  const updateTag = (id, value) => {
    setTags((currentTags) =>
      currentTags.map((tag) => (tag.id === id ? { ...tag, value } : tag)),
    )
  }

  const removeTag = (id) => {
    setTags((currentTags) => currentTags.filter((tag) => tag.id !== id))
    if (tags.length === 1) {
      freeTextRef.current?.focus()
    }
  }

  const addTag = (key, value = '') => {
    const nextTag = createTag(key, value)

    setTags((currentTags) => [...currentTags, nextTag])
    setShowSuggestions(false)
    focusTag(nextTag.id)
  }

  const applyPack = (pack) => {
    const nextTags = createTagsFromPack(pack)

    setTags(nextTags)
    setFreeText(pack.freeText)
    setShowSuggestions(false)
    focusTag(nextTags[0]?.id)
  }

  const resetInput = () => {
    const nextTags = createDefaultTags()

    setTags(nextTags)
    setFreeText('')
    setShowSuggestions(false)
    focusTag(nextTags[0]?.id)
  }

  // Every refine sends a slug down the pipe, however it was triggered.
  const triggerRefine = () => {
    setPulseId((id) => id + 1)
    onRefine()
  }

  const collectTiles = useCallback(
    () => tags.map((tag) => tileRefs.current[tag.id]),
    [tags],
  )

  // Enter inserts a line break inside a tag; Ctrl/Cmd+Enter refines from
  // anywhere. The single-line free-text field keeps plain Enter to submit.
  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      triggerRefine()
    }
  }

  const handleFreeTextKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      triggerRefine()
    }
  }

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 py-2">Start from</span>
        {STARTER_PACKS.map((pack) => (
          <button
            key={pack.key}
            type="button"
            onClick={() => applyPack(pack)}
            aria-describedby={`pack-${pack.key}-tooltip`}
            className="tooltip-anchor btn-ghost brut-press px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em]"
          >
            {pack.label}
            <CustomTooltip id={`pack-${pack.key}-tooltip`} text={pack.blurb} placement="bottom" />
          </button>
        ))}
      </div>

      <div ref={panelRef} className="brut-panel relative p-3 sm:p-4">
        <div data-tour="tags" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => {
            const config = TAG_CONFIG[tag.key] ?? {
              label: tag.key.replace(/_/g, ' '),
              placeholder: 'Tag value',
              tooltip: 'Add details that help the AI understand what you want.',
            }

            return (
              <div
                key={tag.id}
                ref={(node) => {
                  if (node) {
                    tileRefs.current[tag.id] = node
                  } else {
                    delete tileRefs.current[tag.id]
                  }
                }}
                className={`tag-${tag.key} tag-shell flex min-w-0 flex-col border-2`}
              >
                <div className="flex items-stretch justify-between gap-0 border-b-2 border-[color:var(--tag-deep)]">
                  <button
                    type="button"
                    onClick={() => focusTag(tag.id)}
                    aria-describedby={`${tag.id}-tooltip`}
                    aria-label={`${config.label}: ${config.tooltip}`}
                    className="tooltip-anchor tag-chip min-w-0 flex-1 border-0 px-3 py-2 text-left text-[0.7rem] uppercase tracking-[0.1em]"
                  >
                    {config.label}
                    <CustomTooltip id={`${tag.id}-tooltip`} text={config.tooltip} placement="bottom" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${config.label}`}
                    onClick={() => removeTag(tag.id)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-l-2 border-[color:var(--tag-deep)] bg-[color:var(--tag)] text-[#0a0a0a] transition hover:bg-[color:var(--tag-deep)] hover:text-white"
                  >
                    <X className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>

                <textarea
                  ref={(node) => {
                    if (node) {
                      tagRefs.current[tag.id] = node
                      resizeTextarea(node)
                    } else {
                      delete tagRefs.current[tag.id]
                    }
                  }}
                  value={tag.value}
                  rows={2}
                  onChange={(event) => {
                    resizeTextarea(event.currentTarget)
                    updateTag(tag.id, event.target.value)
                  }}
                  onKeyDown={handleTagKeyDown}
                  placeholder={config.placeholder}
                  className="min-h-[3.5rem] w-full resize-none overflow-hidden break-words bg-transparent px-3 py-2.5 text-sm leading-6 text-white placeholder:text-[0.72rem] placeholder:leading-5 placeholder:text-[var(--ink-faint)] focus:outline-none"
                />
              </div>
            )
          })}
        </div>

        <div className="brut-divider mt-4 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-tour="quick-tags" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-tour="add-tag"
              onClick={() => setShowSuggestions(!showSuggestions)}
              aria-expanded={showSuggestions}
              className="btn-ghost brut-press inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              <BadgePlus className="h-4 w-4" strokeWidth={2.5} />
              Add tag
            </button>

            {quickTagKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => addTag(key)}
                aria-describedby={`quick-${key}-tooltip`}
                aria-label={`Add ${TAG_CONFIG[key].label}: ${TAG_CONFIG[key].tooltip}`}
                className={`tag-${key} tag-chip tooltip-anchor brut-press inline-flex items-center gap-1.5 px-2.5 py-2 text-xs uppercase tracking-[0.06em]`}
                style={{ '--press-color': 'var(--tag-deep)' }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                {TAG_CONFIG[key].label}
                <CustomTooltip id={`quick-${key}-tooltip`} text={TAG_CONFIG[key].tooltip} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetInput}
            className="btn-ghost btn-alarm brut-press inline-flex items-center gap-2 self-start px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] sm:self-auto"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.5} />
            Reset
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 lg:flex-row">
          <label
            data-tour="target-model"
            className="flex shrink-0 items-center gap-2 border-2 border-white bg-[var(--slab-deep)] px-3"
          >
            <span className="eyebrow whitespace-nowrap">Written for</span>
            <select
              value={targetModel}
              onChange={(event) => setTargetModel(event.target.value)}
              aria-label={`Target model: ${activeTarget.hint}`}
              className="h-12 min-w-0 cursor-pointer appearance-none bg-transparent pr-5 text-sm font-semibold text-white focus:outline-none"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, transparent 50%, #fff 50%), linear-gradient(135deg, #fff 50%, transparent 50%)',
                backgroundPosition: 'right 6px center, right 1px center',
                backgroundSize: '5px 5px, 5px 5px',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {TARGET_MODELS.map((item) => (
                <option key={item.key} value={item.key} className="bg-[#14151f] text-white">
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div
            ref={promptBoxRef}
            data-tour="freetext"
            className="pipe-inlet flex min-h-12 min-w-0 flex-1 items-center border-2 border-white bg-[var(--slab-deep)] px-3 focus-within:border-[var(--volt)]"
          >
            <span className="mr-2 shrink-0 font-bold text-[var(--volt)]">&gt;</span>
            <input
              ref={freeTextRef}
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleFreeTextKeyDown}
              placeholder="Type normal prompt text"
              className="h-12 w-full bg-transparent text-sm text-white placeholder:text-[var(--ink-faint)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            data-tour="refine"
            onClick={triggerRefine}
            disabled={loading}
            className="btn-volt brut-press inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 text-sm lg:w-auto"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={3} />
            ) : (
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            )}
            {loading ? 'Refining' : 'Refine'}
          </button>
        </div>

        <p className="mt-2.5 text-[0.7rem] text-[var(--ink-faint)]">
          {activeTarget.hint} · Ctrl+Enter to refine from any field
        </p>

        <FlowPipe
          containerRef={panelRef}
          collectTiles={collectTiles}
          targetRef={promptBoxRef}
          flowing={loading}
          pulseId={pulseId}
        />
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-20 mt-3">
          <SuggestionDropdown
            suggestions={SUGGESTIONS}
            onPick={addTag}
            onClose={() => setShowSuggestions(false)}
          />
        </div>
      )}
    </div>
  )
}
