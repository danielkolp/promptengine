import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GraduationCap, History, Settings2 } from 'lucide-react'
import PromptInput from './components/PromptInput'
import ResultPanel from './components/ResultPanel'
import HistoryPanel from './components/HistoryPanel'
import ApiSettings from './components/ApiSettings'
import ResultCue from './components/ResultCue'
import TourGuide from './components/TourGuide'
import { refinePromptWithGroq } from './utils/groqClient'
import { createDefaultTags, createTag, DEFAULT_TARGET_MODEL } from './utils/promptTemplates'
import {
  clearHistory,
  deleteEntry,
  loadHistory,
  saveEntry,
  togglePinned,
} from './utils/history'
import logo from './assets/logo.png'
import './index.css'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

function readSetting(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Settings are a convenience; a storage failure must not break refining.
  }
}

function App() {
  const [tags, setTags] = useState(() => createDefaultTags())
  const [freeText, setFreeText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [targetModel, setTargetModel] = useState(() =>
    readSetting('prompt_engine_target', DEFAULT_TARGET_MODEL))
  const [groqModel, setGroqModel] = useState(() => readSetting('groq_model', DEFAULT_MODEL))
  const [history, setHistory] = useState(() => loadHistory())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  const inputRef = useRef(null)
  const resultRef = useRef(null)
  const tourSnapshot = useRef(null)

  // Announcement for the scroll cue. The sequence number is what remounts the
  // cue, so each result gets its own "seen yet?" state rather than inheriting
  // the last one's.
  const [resultCue, setResultCue] = useState(null)
  const cueSeq = useRef(0)

  const raiseCue = useCallback((message, tone) => {
    cueSeq.current += 1
    setResultCue({ seq: cueSeq.current, message, tone })
  }, [])

  useEffect(() => {
    writeSetting('prompt_engine_target', targetModel)
  }, [targetModel])

  const closeOverlays = useCallback(() => {
    setHistoryOpen(false)
    setSettingsOpen(false)
    setShowSuggestions(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeOverlays()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeOverlays])

  const handleRefine = async () => {
    setLoading(true)
    setResult(null)
    setResultCue(null)
    setShowSuggestions(false)

    const tagPayload = tags.reduce((payload, tag) => {
      const value = tag.value.trim()
      if (value) {
        if (!payload[tag.key]) {
          payload[tag.key] = []
        }
        payload[tag.key].push(value)
      }
      return payload
    }, {})
    const activeFields = tags.map((tag) => tag.key)

    try {
      const res = await refinePromptWithGroq({
        model: groqModel,
        targetModel,
        tags: tagPayload,
        activeFields,
        freeText: freeText.trim(),
      })

      setResult(res)
      setHistory(saveEntry({ tags, freeText, targetModel, result: res }))
      raiseCue('The prompt has been generated', 'done')
    } catch (err) {
      setResult({
        error: {
          title: err?.title || 'Prompt refinement failed',
          message: err instanceof Error ? err.message : String(err),
          details: err?.details,
          status: err?.status,
          code: err?.code,
        },
      })
      raiseCue('Refining failed', 'failed')
    } finally {
      setLoading(false)
    }
  }

  // Feed a refined prompt back in as the next input, keeping the tag structure
  // so its constraints still apply on the second pass.
  const handleReuse = (text) => {
    setFreeText(text)
    setResult(null)
    setResultCue(null)
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleRestore = (entry) => {
    setTags(entry.tags.map((tag) => createTag(tag.key, tag.value)))
    setFreeText(entry.freeText || '')
    setTargetModel(entry.targetModel || DEFAULT_TARGET_MODEL)
    setResult(entry.result)
    setHistoryOpen(false)
    raiseCue('Prompt restored from history', 'done')
  }

  const handleSaveSettings = (nextModel) => {
    setGroqModel(nextModel)
    writeSetting('groq_model', nextModel)
  }

  // The tour types into the real fields, so anything already in progress is
  // put back when it ends. Starting from an empty form is the common case —
  // there the example is left in place, ready to refine.
  const startTour = () => {
    const hadContent = tags.some((tag) => tag.value.trim()) || freeText.trim() !== ''

    tourSnapshot.current = hadContent ? { tags, freeText, targetModel } : null
    closeOverlays()
    setTourOpen(true)
  }

  const endTour = () => {
    setTourOpen(false)
    setShowSuggestions(false)

    const snapshot = tourSnapshot.current
    if (snapshot) {
      setTags(snapshot.tags)
      setFreeText(snapshot.freeText)
      setTargetModel(snapshot.targetModel)
    }

    tourSnapshot.current = null
  }

  /*
    What the core is showing. Derived rather than stored: every one of these is
    already knowable from loading and result, and a second copy of the same
    state is a second thing that can be wrong.
  */
  const engineStatus = loading
    ? 'thinking'
    : result?.error
      ? 'failed'
      : result
        ? 'done'
        : 'idle'

  const tourApi = useMemo(() => ({
    setFreeText,
    setTargetModel,
    setShowSuggestions,
    fillTag: (key, value) => setTags((currentTags) => {
      const match = currentTags.find((tag) => tag.key === key)

      return match
        ? currentTags.map((tag) => (tag.id === match.id ? { ...tag, value } : tag))
        : [...currentTags, createTag(key, value)]
    }),
  }), [])

  return (
    <main className="relative min-h-screen overflow-x-hidden text-[var(--ink)]">
      {/*
        The only texture behind the panels. A drifting particle field used to
        run over this one; two textures competing behind the same content is
        one texture too many, and ambient drift is the opposite of a system
        whose first rule is that nothing is soft.
      */}
      <div className="app-grid pointer-events-none fixed inset-0 z-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b-2 border-[var(--edge)] py-4">
          <span className="logo-lockup block shrink-0">
            <img src={logo} alt="Prompt Engine" />
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startTour}
              className="btn-ghost brut-press t-small inline-flex items-center gap-2 px-3 py-2.5"
            >
              <GraduationCap className="h-4 w-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">Take the tour</span>
            </button>
            <button
              type="button"
              data-tour="history"
              onClick={() => setHistoryOpen(true)}
              className="btn-ghost brut-press t-small inline-flex items-center gap-2 px-3 py-2.5"
            >
              <History className="h-4 w-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">History</span>
              {/*
                A count is information, not an alarm. In volt it was a third
                saturated element in the header competing with the one control
                on the page that has to be found first.
              */}
              {history.length > 0 && (
                <span className="t-micro border-2 border-[var(--edge-soft)] px-1.5 font-semibold text-[var(--ink-mute)]">
                  {history.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className="btn-ghost brut-press inline-flex h-10 w-10 items-center justify-center"
            >
              <Settings2 className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </header>

        <section className="flex-1 pb-16 pt-12 sm:pt-16">
          {/*
            Wide enough that the line breaks after "into", which puts the volt
            phrase on its own line. At the narrower measure it broke mid-phrase
            and left "prompts" stranded on a third line.
          */}
          <h1 className="display max-w-4xl text-[2.15rem] text-[var(--ink)] sm:text-5xl lg:text-[3.5rem]">
            Turn vague ideas into
            <span className="text-[var(--volt)]"> structured prompts</span>
          </h1>
          <p className="t-body mt-5 max-w-md leading-7 text-[var(--ink-mute)]">
            Fill in what you know. Leave out what you don&apos;t. The refiner
            writes the prompt that gets a usable answer.
          </p>

          <div ref={inputRef} className="mt-12 scroll-mt-6">
            <PromptInput
              tags={tags}
              setTags={setTags}
              freeText={freeText}
              setFreeText={setFreeText}
              targetModel={targetModel}
              setTargetModel={setTargetModel}
              onRefine={handleRefine}
              loading={loading}
              engineStatus={engineStatus}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
            />
          </div>

          <div ref={resultRef} className="mt-10 scroll-mt-6">
            <ResultPanel result={result} loading={loading} onReuse={handleReuse} />
          </div>

          {/*
            Stays mounted so the text swap is what triggers the announcement.
            It reports every result, on screen or not — the visible cue below
            only appears when the panel is out of view.
          */}
          <p className="sr-only" role="status" aria-live="polite">
            {resultCue?.message ?? ''}
          </p>
        </section>

        <footer className="brut-divider t-small flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-6 text-[var(--ink-faint)]">
          <span>Prompt Engine</span>
          <span>
            Made by Daniel Kolpakov ·{' '}
            <a
              href="https://danielkolp.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Portfolio
            </a>
          </span>
        </footer>
      </div>

      <HistoryPanel
        open={historyOpen}
        entries={history}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
        onTogglePin={(id) => setHistory(togglePinned(id))}
        onDelete={(id) => setHistory(deleteEntry(id))}
        onClearAll={() => setHistory(clearHistory())}
      />

      <ApiSettings
        key={groqModel}
        open={settingsOpen}
        model={groqModel}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <ResultCue
        key={resultCue?.seq}
        panelRef={resultRef}
        cue={loading ? null : resultCue}
      />

      <TourGuide open={tourOpen} onClose={endTour} api={tourApi} />
    </main>
  )
}

export default App
