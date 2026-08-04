import { Pin, RotateCcw, Trash2, X } from 'lucide-react'
import { formatSavedAt } from '../utils/history'
import { TARGET_MODELS } from '../utils/promptTemplates'

function targetLabel(key) {
  return TARGET_MODELS.find((item) => item.key === key)?.label ?? 'Any model'
}

export default function HistoryPanel({
  open,
  entries,
  onClose,
  onRestore,
  onTogglePin,
  onDelete,
  onClearAll,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/70 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <aside className="brut-panel animate-modal-in scrollbar-brut flex h-full w-full max-w-md flex-col overflow-y-auto p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="history-title" className="display text-2xl text-white">
              History
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">
              {entries.length === 0
                ? 'Saved on this device only'
                : `${entries.length} saved on this device`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close history"
            onClick={onClose}
            className="btn-ghost brut-press inline-flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="brut-slab mt-5 p-5">
            <p className="text-sm leading-6 text-[var(--ink-mute)]">
              Nothing saved yet. Every prompt you refine lands here, so you can
              reopen it and keep working.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-5 space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="brut-slab p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white" title={entry.title}>
                        {entry.title}
                      </p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                        {formatSavedAt(entry.savedAt)} · {targetLabel(entry.targetModel)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePin(entry.id)}
                      aria-label={entry.pinned ? `Unpin ${entry.title}` : `Pin ${entry.title}`}
                      aria-pressed={entry.pinned}
                      className={`brut-press inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 ${
                        entry.pinned
                          ? 'border-[var(--volt)] bg-[var(--volt)] text-[#0a0a0a]'
                          : 'border-white bg-[var(--slab)] text-[var(--ink-mute)]'
                      }`}
                      style={{ '--press-color': 'rgba(255,255,255,0.35)' }}
                    >
                      <Pin className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--ink-mute)]">
                    {entry.result.refined_prompt}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(entry)}
                      className="btn-ghost brut-press inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                      className="btn-ghost btn-alarm brut-press inline-flex h-9 w-9 items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onClearAll}
              className="btn-ghost btn-alarm brut-press mt-5 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              Clear history
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
