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
      <aside className="brut-panel animate-modal-in scrollbar-brut flex h-full w-full max-w-md flex-col overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="history-title" className="display text-2xl text-[var(--ink)]">
              History
            </h2>
            <p className="t-small mt-1.5 text-[var(--ink-faint)]">
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
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="brut-slab mt-6 p-5">
            <p className="t-body leading-7 text-[var(--ink-mute)]">
              Nothing saved yet. Every prompt you refine lands here, so you can
              reopen it and keep working.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="brut-slab p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className="t-body truncate font-semibold text-[var(--ink)]"
                        title={entry.title}
                      >
                        {entry.title}
                      </p>
                      <p className="t-micro mt-1 uppercase tracking-[0.1em] text-[var(--ink-faint)]">
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
                          : 'border-[var(--edge)] bg-[var(--slab)] text-[var(--ink-mute)]'
                      }`}
                      style={{ '--press-color': 'var(--edge-soft)' }}
                    >
                      <Pin className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </button>
                  </div>

                  <p className="mono t-micro mt-2.5 line-clamp-2 leading-5 text-[var(--ink-mute)]">
                    {entry.result.refined_prompt}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(entry)}
                      className="btn-ghost brut-press t-small inline-flex flex-1 items-center justify-center gap-2 px-3 py-2"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                      className="btn-ghost btn-alarm brut-press inline-flex h-9 w-9 items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onClearAll}
              className="btn-ghost btn-alarm brut-press t-small mt-6 inline-flex items-center justify-center gap-2 px-4 py-3"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
              Clear history
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
