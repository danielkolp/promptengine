import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgePlus,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import SuggestionDropdown from './SuggestionDropdown'
import { createDefaultTags, createTag, SUGGESTIONS, TAG_CONFIG } from '../utils/promptTemplates'

const TAG_INPUT_MIN_CH = 18
const TAG_INPUT_MAX_CH = 54

function getTagTileWidth(value, placeholder, label) {
  const contentLength = value ? value.length : placeholder.length
  const labelLength = label.length + 8
  const width = Math.max(TAG_INPUT_MIN_CH, contentLength + 2, labelLength)

  return `${Math.min(width, TAG_INPUT_MAX_CH)}ch`
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

export default function PromptInput({ tags, setTags, freeText, setFreeText, onRefine, loading }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const tagRefs = useRef({})
  const freeTextRef = useRef(null)

  const visibleTags = useMemo(() => tags, [tags])
  const quickTagKeys = Object.keys(TAG_CONFIG)

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

  const resetInput = () => {
    const nextTags = createDefaultTags()

    setTags(nextTags)
    setFreeText('')
    setShowSuggestions(false)
    window.requestAnimationFrame(() => tagRefs.current[nextTags[0]?.id]?.focus())
  }

  const handleEnter = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onRefine()
    }
  }

  return (
    <div className="relative">
      <div className="glass-panel input-shadow rounded-[2rem] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {visibleTags.map((tag) => {
            const config = TAG_CONFIG[tag.key] ?? {
              label: tag.key,
              placeholder: 'Tag value',
              tooltip: 'Add details that help the AI understand what you want.',
            }

            return (
              <div
                key={tag.id}
                style={{
                  width: getTagTileWidth(tag.value, config.placeholder, config.label),
                }}
                className={`tag-${tag.key} tag-shell group flex min-h-[5.75rem] min-w-[18ch] max-w-full flex-col items-stretch rounded-2xl border p-2 transition hover:brightness-110`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => focusTag(tag.id)}
                    aria-describedby={`${tag.id}-tooltip`}
                    aria-label={`${config.label}: ${config.tooltip}`}
                    className="tooltip-anchor tag-label min-w-0 rounded-xl bg-white/[0.07] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] transition group-hover:bg-white/[0.1]"
                  >
                    {config.label}
                    <CustomTooltip id={`${tag.id}-tooltip`} text={config.tooltip} placement="bottom" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${config.label}`}
                    onClick={() => removeTag(tag.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid min-w-0 flex-1">
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
                    rows={1}
                    wrap="soft"
                    onChange={(event) => {
                      resizeTextarea(event.currentTarget)
                      updateTag(tag.id, event.target.value)
                    }}
                    onKeyDown={handleEnter}
                    placeholder={config.placeholder}
                    className="col-start-1 row-start-1 min-h-[2.75rem] w-full resize-none overflow-hidden break-words bg-transparent px-3 py-2 text-sm leading-6 text-white [white-space:pre-wrap] placeholder:text-[0.68rem] placeholder:leading-5 placeholder:text-slate-500 focus:outline-none"
                  />
                  <div
                    aria-hidden="true"
                    className={`invisible col-start-1 row-start-1 min-h-[2.75rem] whitespace-pre-wrap break-words px-3 py-2 ${
                      tag.value ? 'text-sm leading-6' : 'text-[0.68rem] leading-5'
                    }`}
                  >
                    {(tag.value || config.placeholder || ' ') + '\n'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSuggestions((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-slate-300 transition hover:border-violet-300/30 hover:bg-white/[0.08] hover:text-white"
            >
              <BadgePlus className="h-4 w-4" />
              Add tag
            </button>

            {quickTagKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => addTag(key)}
                aria-describedby={`quick-${key}-tooltip`}
                aria-label={`Add ${TAG_CONFIG[key].label}: ${TAG_CONFIG[key].tooltip}`}
                className={`tooltip-anchor tag-${key} tag-shell inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition hover:brightness-110`}
              >
                <Plus className="tag-label h-3.5 w-3.5" />
                <span className="tag-label">{TAG_CONFIG[key].label}</span>
                <CustomTooltip id={`quick-${key}-tooltip`} text={TAG_CONFIG[key].tooltip} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetInput}
            className="inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white sm:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.035] px-3 transition focus-within:border-violet-300/35 focus-within:bg-white/[0.055]">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
            <input
              ref={freeTextRef}
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleEnter}
              placeholder="Type normal prompt text"
              className="h-12 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onRefine}
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-400 px-5 text-sm font-semibold text-[#120d22] shadow-lg shadow-violet-950/35 transition hover:bg-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200/60 disabled:opacity-60 sm:w-auto"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Refine Prompt
          </button>
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
