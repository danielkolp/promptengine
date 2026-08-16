import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown } from 'lucide-react'

/*
  The result panel renders under the tag grid, which on a laptop is tall enough
  to fill the viewport on its own — so a refine can finish with nothing on
  screen changing. This watches the panel and, while it is off screen, offers a
  way down to it.

  It retires as soon as the panel has been seen. The cue reports that something
  arrived; bringing it back every time the user scrolls up would turn a
  notification into a permanent fixture.
*/
export default function ResultCue({ panelRef, cue }) {
  const [offScreen, setOffScreen] = useState(false)
  const seen = useRef(false)

  useEffect(() => {
    const node = panelRef.current

    if (!cue || !node || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          seen.current = true
          setOffScreen(false)
        } else if (!seen.current) {
          setOffScreen(true)
        }
      },
      /*
        Pulling the root's bottom edge up means a sliver peeking over the fold
        doesn't count: the panel is "seen" once there is enough of it on screen
        to read, not once its first pixel arrives.
      */
      { rootMargin: '0px 0px -96px 0px', threshold: 0 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [cue, panelRef])

  if (!cue || !offScreen) return null

  const failed = cue.tone === 'failed'
  const accent = failed ? 'var(--alarm)' : 'var(--volt)'
  const Icon = failed ? AlertTriangle : ArrowDown

  const goToResult = () => {
    seen.current = true
    setOffScreen(false)

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    panelRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  /*
    No live region here on purpose. This subtree is remounted per result, and a
    region that arrives already holding its message is unreliably announced —
    App keeps a permanently mounted one and swaps the text into it instead.
  */
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-3">
      {/*
        The entry animation sits on its own element: `.brut-press` drives the
        press physics with a transform, and a filled animation on the same node
        would hold its own transform and cancel the press.
      */}
      <div className="animate-cue-in pointer-events-auto">
        <button
          type="button"
          onClick={goToResult}
          className="brut-press t-small inline-flex items-center gap-3 border-2 bg-[var(--slab)] py-2 pl-2 pr-4 text-left font-semibold text-[var(--ink)]"
          style={{ borderColor: accent, '--press-color': accent }}
        >
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[#0a0a0a]"
            style={{ background: accent }}
          >
            <Icon
              className={`h-4 w-4 ${failed ? '' : 'animate-nudge'}`}
              strokeWidth={3}
            />
          </span>
          {cue.message}
        </button>
      </div>
    </div>
  )
}
