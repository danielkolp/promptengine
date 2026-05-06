import { memo, useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import PromptInput from './components/PromptInput'
import ResultPanel from './components/ResultPanel'
import { refinePromptWithGroq } from './utils/groqClient'
import { createDefaultTags } from './utils/promptTemplates'
import logo from './assets/logo.png'
import './index.css'

const StableParticles = memo(Particles)

let particlesEngineInitPromise

function initPromptParticles() {
  if (!particlesEngineInitPromise) {
    particlesEngineInitPromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    })
  }

  return particlesEngineInitPromise
}

function App() {
  const [tags, setTags] = useState(() => createDefaultTags())
  const [freeText, setFreeText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const [particlesReady, setParticlesReady] = useState(false)
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
      color: { value: ['#f5f3ff', '#bfdbfe', '#c4b5fd'] },
      links: {
        color: '#e0e7ff',
        distance: 190,
        enable: true,
        opacity: 0.22,
        width: 1.35,
      },
      move: {
        enable: true,
        speed: 0.55,
        outModes: { default: 'out' },
      },
      number: {
        density: { enable: true, area: 760 },
        value: 125,
      },
      opacity: { value: { min: 0.2, max: 0.3} },
      size: { value: { min: 1.15, max: 2.75 } },
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

  const handleRefine = async () => {
    setLoading(true)
    setResult(null)

    const model = localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile'
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

    try {
      const res = await refinePromptWithGroq({
        model,
        tags: tagPayload,
        freeText: freeText.trim(),
      })
      setResult(res)
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

  return (
    <main className="relative min-h-screen overflow-x-hidden text-slate-100">
      {particlesReady && (
        <StableParticles
          id="tsparticles"
          className="pointer-events-none fixed inset-0 z-0 opacity-100"
          options={particleOptions}
        />
      )}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-16 sm:px-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center pb-10 pt-8 text-center sm:pb-14">
          
          <h1 className="mx-auto">
            <span className="logo-lockup block">
              <img src={logo} alt="Prompt Engine" />
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-slate-400 sm:text-lg">
            Turn messy intent into structured prompts.
          </p>

          <div className="mt-10 text-left">
            <PromptInput
              tags={tags}
              setTags={setTags}
              freeText={freeText}
              setFreeText={setFreeText}
              onRefine={handleRefine}
              loading={loading}
            />
          </div>

          <div className="mt-8 text-left">
            <ResultPanel result={result} loading={loading} />
          </div>
        </section>
      </div>

    </main>
  )
}

export default App
