import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, BadgePlus, LoaderCircle, Trash2, X } from 'lucide-react'
import SuggestionDropdown from './SuggestionDropdown'
import EngineCore from './EngineCore'
import StarBorder from './StarBorder'
import {
  createDefaultTags,
  createTag,
  STARTER_PACKS,
  SUGGESTIONS,
  TAG_CONFIG,
  TARGET_MODELS,
  createTagsFromPack,
} from '../utils/promptTemplates'

/*
  How long the light spends on each field before moving to the next. The star
  border completes exactly one orbit in this time, so a field is lit, circled
  once, and handed on.

  Eight fields at this step is a little over five seconds for a full pass, which
  is the right order of magnitude for a refine: long enough that the light is
  legibly visiting one field at a time, short enough that a fast response still
  gets some way down the grid.
*/
const STAR_STEP_MS = 700

/*
  Which field the light is on.

  An earlier version gave every tile the same infinite animation and staggered
  its delay. That is a wave, not a sequence: with a 140ms offset against a 1.8s
  orbit, all eight tiles are lit at once and merely out of phase, which is the
  opposite of visiting them in order. Only one tile is lit at a time now, and
  the index is what moves.

  A count below two has nothing to advance through, so the interval is not
  started at all rather than firing pointlessly against a single field.
*/
function useRefineSequence(active, count) {
  const [index, setIndex] = useState(0)
  const [lastActive, setLastActive] = useState(active)

  // Every run starts at the first field rather than resuming wherever the
  // previous one happened to stop.
  if (active !== lastActive) {
    setLastActive(active)
    setIndex(0)
  }

  useEffect(() => {
    if (!active || count < 2) return undefined

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, STAR_STEP_MS)

    return () => clearInterval(id)
  }, [active, count])

  return index
}

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
  engineStatus,
  showSuggestions,
  setShowSuggestions,
}) {
  const tagRefs = useRef({})
  const freeTextRef = useRef(null)
  const panelRef = useRef(null)

  const quickTagKeys = Object.keys(TAG_CONFIG)
  const activeTarget = TARGET_MODELS.find((item) => item.key === targetModel) ?? TARGET_MODELS[0]
  const litIndex = useRefineSequence(loading, tags.length)

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

  // Enter inserts a line break inside a tag; Ctrl/Cmd+Enter refines from
  // anywhere. The single-line free-text field keeps plain Enter to submit.
  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onRefine()
    }
  }

  const handleFreeTextKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onRefine()
    }
  }

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 py-2">Start from</span>
        {STARTER_PACKS.map((pack) => (
          <button
            key={pack.key}
            type="button"
            onClick={() => applyPack(pack)}
            aria-describedby={`pack-${pack.key}-tooltip`}
            className="tooltip-anchor btn-ghost brut-press t-small px-3 py-2"
          >
            {pack.label}
            <CustomTooltip id={`pack-${pack.key}-tooltip`} text={pack.blurb} placement="bottom" />
          </button>
        ))}
      </div>

      <div ref={panelRef} className="brut-panel relative p-4 sm:p-5">
        <div data-tour="tags" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag, index) => {
            const config = TAG_CONFIG[tag.key] ?? {
              label: tag.key.replace(/_/g, ' '),
              placeholder: 'Tag value',
              tooltip: 'Add details that help the AI understand what you want.',
            }

            return (
              <div
                key={tag.id}
                className={`tag-${tag.key} tag-shell flex min-w-0 flex-col border-2`}
              >
                {/*
                  Only while a refine is running, and only on the field the
                  light has reached. Mounting it on one tile at a time is what
                  makes this a sequence — the fields are visited in the order
                  the refiner receives them, one after another to the last.
                */}
                {loading && index === litIndex && (
                  <StarBorder speed={`${STAR_STEP_MS}ms`} />
                )}

                <div className="tag-head flex items-stretch justify-between gap-0">
                  <button
                    type="button"
                    onClick={() => focusTag(tag.id)}
                    aria-describedby={`${tag.id}-tooltip`}
                    aria-label={`${config.label}: ${config.tooltip}`}
                    className="tooltip-anchor tag-head__name t-micro min-w-0 flex-1 px-3 py-2.5 text-left uppercase tracking-[0.12em]"
                  >
                    {config.label}
                    <CustomTooltip id={`${tag.id}-tooltip`} text={config.tooltip} placement="bottom" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${config.label}`}
                    onClick={() => removeTag(tag.id)}
                    className="tag-remove inline-flex h-9 w-9 shrink-0 items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
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
                  className="mono t-small min-h-[3.5rem] w-full resize-none overflow-hidden break-words bg-transparent px-3 py-2.5 leading-6 text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
                />
              </div>
            )
          })}
        </div>

        <div className="brut-divider mt-5 flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div data-tour="quick-tags" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-tour="add-tag"
              onClick={() => setShowSuggestions(!showSuggestions)}
              aria-expanded={showSuggestions}
              className="btn-ghost brut-press t-small inline-flex items-center gap-2 px-3 py-2"
            >
              <BadgePlus className="h-4 w-4" strokeWidth={2.25} />
              Add tag
            </button>

            {quickTagKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => addTag(key)}
                aria-describedby={`quick-${key}-tooltip`}
                aria-label={`Add ${TAG_CONFIG[key].label}: ${TAG_CONFIG[key].tooltip}`}
                className={`tag-${key} tag-pill tooltip-anchor brut-press t-micro inline-flex items-center gap-2 px-2.5 py-2 uppercase tracking-[0.1em]`}
              >
                <span className="tag-pill__key" aria-hidden="true" />
                {TAG_CONFIG[key].label}
                <CustomTooltip id={`quick-${key}-tooltip`} text={TAG_CONFIG[key].tooltip} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetInput}
            className="btn-ghost btn-alarm brut-press t-small inline-flex items-center gap-2 self-start px-3 py-2 sm:self-auto"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
            Reset
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 lg:flex-row">
          <label
            data-tour="target-model"
            className="flex shrink-0 items-center gap-2 border-2 border-[var(--edge)] bg-[var(--slab-deep)] px-3"
          >
            <span className="eyebrow whitespace-nowrap">Written for</span>
            <select
              value={targetModel}
              onChange={(event) => setTargetModel(event.target.value)}
              aria-label={`Target model: ${activeTarget.hint}`}
              className="mono t-small h-12 min-w-0 cursor-pointer appearance-none bg-transparent pr-5 text-[var(--ink)] focus:outline-none"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, transparent 50%, #969bb0 50%), linear-gradient(135deg, #969bb0 50%, transparent 50%)',
                backgroundPosition: 'right 6px center, right 1px center',
                backgroundSize: '5px 5px, 5px 5px',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {TARGET_MODELS.map((item) => (
                <option key={item.key} value={item.key} className="bg-[#15161f] text-[#f0f1f7]">
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {/*
            The core sits at the far end of the field, inside its border, with
            no padding after it — text runs left to right into the thing that
            consumes it, and the manifold already drains into this same box. The
            chain reads tags → field → core → refine without a diagram.
          */}
          <div
                       data-tour="freetext"
            className="flex min-h-12 min-w-0 flex-1 items-center border-2 border-[var(--edge)] bg-[var(--slab-deep)] pl-3 focus-within:border-[var(--volt)]"
          >
            <span className="mono mr-2 shrink-0 font-bold text-[var(--volt)]">&gt;</span>
            <input
              ref={freeTextRef}
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleFreeTextKeyDown}
              placeholder="Type normal prompt text"
              className="mono t-small h-12 w-full bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
            />
            <EngineCore status={engineStatus} />
          </div>

          <button
            type="button"
            data-tour="refine"
            onClick={onRefine}
            disabled={loading}
            className="btn-volt brut-press t-small inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 lg:w-auto"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={3} />
            ) : (
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            )}
            {loading ? 'Refining' : 'Refine'}
          </button>
        </div>

        {/*
          A description of the target model and a keybinding are two different
          registers; running them together on one line separated by a middot
          read as one sentence that changed subject halfway through.
        */}
        <div className="t-small mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[var(--ink-faint)]">
          <span>{activeTarget.hint}</span>
          <span className="flex items-center gap-1.5">
            <span className="kbd">Ctrl</span>
            <span className="kbd">Enter</span>
            refines from any field
          </span>
        </div>
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
