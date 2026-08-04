import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { TOUR_STEPS } from '../utils/tourSteps'

const GAP = 10
const CARD_W = 352
const EDGE = 12

/*
  A guided tour over the live interface.

  Positioning is written straight to the DOM instead of held in state: the
  overlay re-measures on every scroll and resize frame, and routing that
  through React would re-render the card on each one.

  The backdrop is four panels fenced around the target rather than one sheet
  with a hole punched in it. That leaves the highlighted control genuinely
  clickable — the tour demonstrates the app, so the app has to stay usable.
*/
export default function TourGuide({ open, onClose, api }) {
  const [index, setIndex] = useState(0)

  const cardRef = useRef(null)
  const ringRef = useRef(null)
  const topRef = useRef(null)
  const rightRef = useRef(null)
  const bottomRef = useRef(null)
  const leftRef = useRef(null)

  const step = TOUR_STEPS[index]
  const isLast = index === TOUR_STEPS.length - 1

  const layout = useCallback(() => {
    const card = cardRef.current
    if (!card) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const target = step?.target
      ? document.querySelector(`[data-tour="${step.target}"]`)
      : null

    const panels = [topRef, rightRef, bottomRef, leftRef].map((ref) => ref.current)
    const ring = ringRef.current

    if (!target) {
      // No anchor: dim everything with the top panel and centre the card.
      if (panels[0]) {
        panels[0].style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0'
      }
      panels.slice(1).forEach((panel) => {
        if (panel) panel.style.cssText = 'position:fixed;width:0;height:0'
      })
      if (ring) ring.style.opacity = '0'

      card.style.left = `${Math.max(EDGE, (vw - card.offsetWidth) / 2)}px`
      card.style.top = `${Math.max(EDGE, (vh - card.offsetHeight) / 2)}px`
      return
    }

    const r = target.getBoundingClientRect()
    const box = {
      left: Math.max(0, r.left - 6),
      top: Math.max(0, r.top - 6),
      right: Math.min(vw, r.right + 6),
      bottom: Math.min(vh, r.bottom + 6),
    }

    const [top, right, bottom, left] = panels
    if (top) top.style.cssText = `position:fixed;left:0;top:0;width:100%;height:${box.top}px`
    if (bottom) bottom.style.cssText = `position:fixed;left:0;top:${box.bottom}px;width:100%;height:${Math.max(0, vh - box.bottom)}px`
    if (left) left.style.cssText = `position:fixed;left:0;top:${box.top}px;width:${box.left}px;height:${box.bottom - box.top}px`
    if (right) right.style.cssText = `position:fixed;left:${box.right}px;top:${box.top}px;width:${Math.max(0, vw - box.right)}px;height:${box.bottom - box.top}px`

    if (ring) {
      ring.style.opacity = '1'
      ring.style.left = `${box.left}px`
      ring.style.top = `${box.top}px`
      ring.style.width = `${box.right - box.left}px`
      ring.style.height = `${box.bottom - box.top}px`
    }

    // Prefer below the target, flip above when it would run off screen.
    const cardH = card.offsetHeight
    const below = box.bottom + GAP
    const above = box.top - cardH - GAP
    const top_ = below + cardH <= vh - EDGE || above < EDGE ? below : above

    card.style.top = `${Math.min(Math.max(EDGE, top_), Math.max(EDGE, vh - cardH - EDGE))}px`
    card.style.left = `${Math.min(
      Math.max(EDGE, (box.left + box.right) / 2 - card.offsetWidth / 2),
      Math.max(EDGE, vw - card.offsetWidth - EDGE),
    )}px`
  }, [step])

  // Bring the anchor into view before measuring it.
  useEffect(() => {
    if (!open || !step?.target) return

    document
      .querySelector(`[data-tour="${step.target}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [open, step])

  useLayoutEffect(() => {
    if (open) layout()
  }, [open, layout])

  useEffect(() => {
    if (!open) return undefined

    let raf = 0
    const onFrame = () => {
      layout()
      raf = window.requestAnimationFrame(onFrame)
    }
    raf = window.requestAnimationFrame(onFrame)

    return () => window.cancelAnimationFrame(raf)
  }, [open, layout])

  const goTo = useCallback((next) => {
    const target = TOUR_STEPS[next]
    if (!target) return

    target.apply?.(api)
    setIndex(next)
  }, [api])

  const finish = useCallback(() => {
    setIndex(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        finish()
      } else if (event.key === 'ArrowRight') {
        if (index < TOUR_STEPS.length - 1) goTo(index + 1)
      } else if (event.key === 'ArrowLeft') {
        if (index > 0) goTo(index - 1)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, index, goTo, finish])

  if (!open) return null

  return (
    <>
      <div ref={topRef} className="tour-shade" />
      <div ref={rightRef} className="tour-shade" />
      <div ref={bottomRef} className="tour-shade" />
      <div ref={leftRef} className="tour-shade" />
      <div ref={ringRef} className="tour-ring" aria-hidden="true" />

      <div
        ref={cardRef}
        className="tour-card brut-panel"
        style={{ width: CARD_W }}
        role="dialog"
        aria-label={`Tutorial step ${index + 1} of ${TOUR_STEPS.length}`}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-white bg-[var(--volt)] px-3 py-2">
          <span className="display text-xs text-[#0a0a0a]">
            Step {index + 1} / {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={finish}
            aria-label="End tutorial"
            className="inline-flex h-6 w-6 items-center justify-center border-2 border-[#0a0a0a] text-[#0a0a0a] transition hover:bg-[#0a0a0a] hover:text-[var(--volt)]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>

        <div className="p-4" aria-live="polite">
          <h2 className="display text-lg text-white">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-mute)]">{step.body}</p>

          <div className="mt-4 flex items-center gap-1" aria-hidden="true">
            {TOUR_STEPS.map((item, i) => (
              <span
                key={item.id}
                className={`h-1.5 flex-1 border border-white ${i <= index ? 'bg-[var(--volt)]' : 'bg-transparent'}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="btn-ghost brut-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
              Back
            </button>

            <button
              type="button"
              onClick={() => (isLast ? finish() : goTo(index + 1))}
              className="btn-volt brut-press inline-flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              {isLast ? 'Done' : 'Next'}
              {isLast ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
