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
    <div data-tour="suggestions" className="brut-panel animate-dropdown-in p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="display text-base text-white">Add a tag</p>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Pick a suggestion to add a filled tag block
          </p>
        </div>
        <button
          type="button"
          aria-label="Close suggestions"
          onClick={onClose}
          className="btn-ghost brut-press inline-flex h-9 w-9 shrink-0 items-center justify-center"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(suggestions).map(([group, items]) => {
          const config = TAG_CONFIG[group] ?? {
            label: group.replace(/_/g, ' '),
            tooltip: 'Add this detail as a new tag block.',
          }

          return (
            <div key={group} className={`tag-${group} brut-slab border-[color:var(--tag)] p-3`}>
              <span className="tag-label mb-2.5 block text-[0.68rem] font-bold uppercase tracking-[0.12em]">
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
                      className="tooltip-anchor brut-press inline-flex items-center gap-1.5 border-2 border-[color:var(--tag)] bg-[var(--slab)] px-2.5 py-1.5 text-xs text-white transition hover:bg-[color:var(--tag)] hover:text-[#0a0a0a]"
                      style={{ '--press-color': 'var(--tag)' }}
                    >
                      <Plus className="h-3 w-3" strokeWidth={3} />
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
