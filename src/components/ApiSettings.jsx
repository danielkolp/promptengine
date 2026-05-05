import { useState } from 'react'
import { ServerCog, Save, Trash2, X } from 'lucide-react'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

export default function ApiSettings({ open, onClose }) {
  const [model, setModel] = useState(() => localStorage.getItem('groq_model') || DEFAULT_MODEL)

  const save = () => {
    const nextModel = model.trim() || DEFAULT_MODEL

    localStorage.removeItem('groq_api_key')
    localStorage.setItem('groq_model', nextModel)
    setModel(nextModel)
    onClose()
  }

  const clear = () => {
    localStorage.removeItem('groq_api_key')
    localStorage.removeItem('groq_model')
    setModel(DEFAULT_MODEL)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-settings-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <aside className="glass-panel animate-modal-in h-full w-full max-w-md overflow-y-auto rounded-3xl p-5 sm:h-auto sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200">
              <ServerCog className="h-5 w-5" />
            </div>
            <h2 id="api-settings-title" className="text-xl font-semibold text-white">
              API Settings
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              The API key is read by the local backend from src/.env.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close API settings"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
          For production, API keys should be stored on a backend, not in the browser.
        </p>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Model name</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/15"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-400 px-5 py-3 text-sm font-semibold text-[#120d22] transition hover:bg-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200/60"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </aside>
    </div>
  )
}
