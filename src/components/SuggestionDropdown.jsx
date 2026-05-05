import { Plus, X } from 'lucide-react'
import { TAG_CONFIG } from '../utils/promptTemplates'

export default function SuggestionDropdown({ suggestions, onPick, onClose }) {
  return (
    <div className="glass-panel animate-dropdown-in rounded-3xl p-4 shadow-2xl shadow-black/40">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Add quick tag</p>
          <p className="mt-0.5 text-xs text-slate-500">Pick a suggestion to add a new tag block.</p>
        </div>
        <button
          type="button"
          aria-label="Close suggestions"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(suggestions).map(([group, items]) => (
          <div key={group} className={`tag-${group} rounded-2xl border border-white/10 bg-black/10 p-3`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="tag-label text-xs font-semibold uppercase tracking-[0.14em]">
                {TAG_CONFIG[group]?.label ?? group} suggestions
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPick(group, item)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-500" />
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
