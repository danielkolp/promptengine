import { useState } from 'react'
import { RotateCcw, Save, X } from 'lucide-react'
import { DEFAULT_GROQ_MODEL } from '../utils/groqModels'

export default function ApiSettings({ open, model, onSave, onClose }) {
  const [draftModel, setDraftModel] = useState(model)

  if (!open) return null

  const save = () => {
    onSave(draftModel.trim() || DEFAULT_GROQ_MODEL)
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
      <aside className="brut-panel animate-modal-in scrollbar-brut h-full w-full max-w-md overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="api-settings-title" className="display text-2xl text-[var(--ink)]">
              Settings
            </h2>
            <p className="t-small mt-1.5 text-[var(--ink-faint)]">
              Which Groq model does the refining
            </p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="btn-ghost brut-press inline-flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <label className="mt-7 block">
          <span className="eyebrow">Refiner model</span>
          <input
            value={draftModel}
            onChange={(event) => setDraftModel(event.target.value)}
            spellCheck="false"
            className="mono brut-slab t-small mt-2.5 h-12 w-full px-3 text-[var(--ink)] focus:border-[var(--volt)] focus:outline-none"
          />
        </label>

        <p className="brut-slab t-small mt-4 p-4 leading-7 text-[var(--ink-mute)]">
          This is the model that rewrites your prompt, not the model the prompt
          is written for. Set that with{' '}
          <strong className="font-semibold text-[var(--ink)]">Written for</strong> next to the
          refine button.
        </p>

        {/*
          A one-line reassurance, not a warning. Saturated yellow end to end was
          the first attempt and read as an alert; a volt rule down the side was
          the second and still did, because volt is the alert colour here. The
          path itself is the emphasis this needs.
        */}
        <p className="t-small mt-4 border-l-2 border-[var(--edge)] bg-[var(--slab-deep)] py-3 pl-4 pr-4 leading-7 text-[var(--ink-mute)]">
          The API key stays on the backend and is read from{' '}
          <span className="mono text-[var(--ink)]">src/.env</span>. It is never sent to the
          browser.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDraftModel(DEFAULT_GROQ_MODEL)}
            className="btn-ghost brut-press t-small inline-flex items-center justify-center gap-2 px-4 py-3"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            Default
          </button>
          <button
            type="button"
            onClick={save}
            className="btn-volt brut-press t-small inline-flex items-center justify-center gap-2 px-5 py-3"
          >
            <Save className="h-4 w-4" strokeWidth={2.5} />
            Save
          </button>
        </div>
      </aside>
    </div>
  )
}
