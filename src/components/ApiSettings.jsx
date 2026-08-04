import { useState } from 'react'
import { RotateCcw, Save, X } from 'lucide-react'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

export default function ApiSettings({ open, model, onSave, onClose }) {
  const [draftModel, setDraftModel] = useState(model)

  if (!open) return null

  const save = () => {
    onSave(draftModel.trim() || DEFAULT_MODEL)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/70 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-settings-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <aside className="brut-panel animate-modal-in scrollbar-brut h-full w-full max-w-md overflow-y-auto p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="api-settings-title" className="display text-2xl text-white">
              Settings
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">
              Which Groq model does the refining
            </p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="btn-ghost brut-press inline-flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="eyebrow">Refiner model</span>
          <input
            value={draftModel}
            onChange={(event) => setDraftModel(event.target.value)}
            spellCheck="false"
            className="brut-slab mt-2 h-12 w-full px-3 text-sm text-white focus:border-[var(--volt)] focus:outline-none"
          />
        </label>

        <p className="brut-slab mt-4 p-3 text-xs leading-6 text-[var(--ink-mute)]">
          This is the model that rewrites your prompt, not the model the prompt
          is written for. Set that with <strong className="text-white">Written for</strong> next
          to the refine button.
        </p>

        <p className="mt-4 border-2 border-[var(--volt)] p-3 text-xs leading-6 text-[var(--volt)]">
          The API key stays on the backend and is read from src/.env. It is never
          sent to the browser.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDraftModel(DEFAULT_MODEL)}
            className="btn-ghost brut-press inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Default
          </button>
          <button
            type="button"
            onClick={save}
            className="btn-volt brut-press inline-flex items-center justify-center gap-2 px-5 py-3 text-xs"
          >
            <Save className="h-4 w-4" strokeWidth={2.5} />
            Save
          </button>
        </div>
      </aside>
    </div>
  )
}
