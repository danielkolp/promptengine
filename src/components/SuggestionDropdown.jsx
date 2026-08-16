import { Plus, X } from 'lucide-react'
import { TAG_CONFIG } from '../utils/promptTemplates'

function CustomTooltip({ id, text }) {
  return (
    <span id={id} role="tooltip" className="custom-tooltip">
      {text}
    </span>
  )
}

export default function SuggestionDropdown({ suggestions, onPick, onClose }) {
  return (
    <div data-tour="suggestions" className="brut-panel animate-dropdown-in p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="title-sm text-[var(--ink)]">Add a tag</p>
          <p className="t-small mt-1 text-[var(--ink-faint)]">
            Pick a suggestion to add a filled tag block
          </p>
        </div>
        <button
          type="button"
          aria-label="Close suggestions"
          onClick={onClose}
          className="btn-ghost brut-press inline-flex h-9 w-9 shrink-0 items-center justify-center"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(suggestions).map(([group, items]) => {
          const config = TAG_CONFIG[group] ?? {
            label: group.replace(/_/g, ' '),
            tooltip: 'Add this detail as a new tag block.',
          }

          return (
            <div key={group} className={`tag-${group} brut-slab p-3.5`}>
              <span className="tag-label t-micro mb-3 block font-semibold uppercase tracking-[0.12em]">
                {config.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {items.map((item, index) => {
                  const tooltipId = `suggestion-${group}-${index}-tooltip`

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPick(group, item)}
                      aria-describedby={tooltipId}
                      aria-label={`Add ${item} to ${config.label}: ${config.tooltip}`}
                      className="tooltip-anchor brut-press t-small inline-flex items-center gap-1.5 border-2 border-[var(--edge-soft)] bg-[var(--slab)] px-2.5 py-1.5 text-[var(--ink)] transition hover:border-[color:var(--tag)] hover:bg-[color:var(--tag)] hover:text-[#0a0a0a]"
                      style={{ '--press-color': 'var(--tag-deep)' }}
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.75} />
                      {item}
                      <CustomTooltip id={tooltipId} text={`${config.label}: ${config.tooltip}`} />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
