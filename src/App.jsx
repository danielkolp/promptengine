import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { GraduationCap, History, Settings2 } from 'lucide-react'
import PromptInput from './components/PromptInput'
import ResultPanel from './components/ResultPanel'
import HistoryPanel from './components/HistoryPanel'
import ApiSettings from './components/ApiSettings'
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

const StableParticles = memo(Particles)
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

let particlesEngineInitPromise

function initPromptParticles() {
  if (!particlesEngineInitPromise) {
    particlesEngineInitPromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    })
  }

  return particlesEngineInitPromise
}

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
  const tourSnapshot = useRef(null)
  const [particlesReady, setParticlesReady] = useState(false)

  // Flat white squares, no links, no twinkle — motion without softness.
  const particleOptions = useMemo(() => ({
    fullScreen: { enable: false },
    fpsLimit: 60,
    interactivity: {
      events: {
        onClick: { enable: false },
        onHover: { enable: false },
        resize: true,
      },
    },
    particles: {
      color: { value: '#ffffff' },
      links: { enable: false },
      move: {
        enable: true,
        speed: 0.32,
        outModes: { default: 'out' },
      },
      number: {
        density: { enable: true, area: 900 },
        value: 70,
      },
      opacity: { value: 0.16 },
      shape: { type: 'square' },
      size: { value: 2.5 },
    },
    detectRetina: true,
  }), [])

  useEffect(() => {
    let mounted = true

    initPromptParticles().then(() => {
      if (mounted) {
        setParticlesReady(true)
      }
    })

    return () => {
      mounted = false
    }
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
    } finally {
      setLoading(false)
    }
  }

  // Feed a refined prompt back in as the next input, keeping the tag structure
  // so its constraints still apply on the second pass.
  const handleReuse = (text) => {
    setFreeText(text)
    setResult(null)
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleRestore = (entry) => {
    setTags(entry.tags.map((tag) => createTag(tag.key, tag.value)))
    setFreeText(entry.freeText || '')
    setTargetModel(entry.targetModel || DEFAULT_TARGET_MODEL)
    setResult(entry.result)
    setHistoryOpen(false)
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
    <main className="relative min-h-screen overflow-x-hidden text-white">
      <div className="app-grid pointer-events-none fixed inset-0 z-0" aria-hidden="true" />

      {particlesReady && (
        <StableParticles
          id="tsparticles"
          className="pointer-events-none fixed inset-0 z-0"
          options={particleOptions}
        />
      )}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b-2 border-white py-4">
          <span className="logo-lockup block shrink-0">
            <img src={logo} alt="Prompt Engine" />
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startTour}
              className="btn-ghost brut-press inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">How do I use this?</span>
            </button>
            <button
              type="button"
              data-tour="history"
              onClick={() => setHistoryOpen(true)}
              className="btn-ghost brut-press inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              <History className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="border-2 border-[#0a0a0a] bg-[var(--volt)] px-1.5 text-[0.65rem] font-bold text-[#0a0a0a]">
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
              <Settings2 className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="flex-1 pb-16 pt-10 sm:pt-14">
          <p className="eyebrow">Prompt refinement</p>
          <h1 className="display mt-3 max-w-4xl text-[2.1rem] leading-[0.95] text-white sm:text-5xl lg:text-6xl">
            Turn messy intent into
            <span className="text-[var(--volt)]"> structured prompts</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink-mute)] sm:text-base">
            Fill in what you know. Leave out what you don&apos;t. The refiner
            writes the prompt that gets a usable answer.
          </p>

          <div ref={inputRef} className="mt-10 scroll-mt-6">
            <PromptInput
              tags={tags}
              setTags={setTags}
              freeText={freeText}
              setFreeText={setFreeText}
              targetModel={targetModel}
              setTargetModel={setTargetModel}
              onRefine={handleRefine}
              loading={loading}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
            />
          </div>

          <div className="mt-8">
            <ResultPanel result={result} loading={loading} onReuse={handleReuse} />
          </div>
        </section>

        <footer className="border-t-2 border-white/25 py-5 text-[0.7rem] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          Prompt Engine · Made by Daniel Kolpakov ·{' '}
          <a
            href="https://danielkolp.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Visit Portfolio
          </a>
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

      <TourGuide open={tourOpen} onClose={endTour} api={tourApi} />
    </main>
  )
}

export default App
