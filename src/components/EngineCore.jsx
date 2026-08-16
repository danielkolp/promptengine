import { useEffect, useRef, useState } from 'react'
import { MeshGradient } from '@paper-design/shaders-react'

/*
  The engine's core, sitting next to the control that runs it.

  This is the one soft thing on the page, and it is deliberate. Rule 1 of the
  system is that nothing is soft — no blur, no gradient fills — which is exactly
  what makes a single fenced gradient read as the living part of a machine that
  is otherwise all hard edges. It only works while it stays the exception: the
  2px casing around it is doing real work, because an unframed gradient bleeding
  into a brutalist panel is just a mistake.

  It lives inside the prompt field's border rather than beside it, because what
  it reports on is what that field is about to be turned into. Sitting apart, it
  was a status lamp bolted to the row; sitting in the outlet, it is the far end
  of the same instrument.

  It says one thing the rest of the row cannot: whether the engine is asleep,
  working, finished, or jammed. The button beside it can only say "Refining".
*/

/*
  The form. Every one of these is fixed for the life of the component, and that
  is the whole point: distortion and swirl are what shape the gradient, so
  varying them per state made the core visibly change form on every transition.
  It should be one object that changes colour, not four different objects.
*/
const FORM = {
  distortion: 0.8,
  swirl: 1,
  grainMixer: 0,
  grainOverlay: 0.28,
  scale: 0.48,
  rotation: 220,
  offsetX: -0.06,
  offsetY: -0.1,
}

/*
  What actually varies: five colours and a rate. Nothing structural.

  Five rather than three because three near neighbours average out into a flat
  wash at 48px — the shader needs a spread to have anything to move around.
  Each palette runs from a near-black base through the family's mid tones to one
  highlight brighter than the rest, so there is real contrast turning over
  inside the square rather than a single tone breathing.

  INVARIANT: every palette is the same length. The transition pairs them by
  index, so a state with fewer entries would leave channels unmatched.
*/
const STATES = {
  /*
    Dormant — dark, cool, slightly earthy.
    Enough variation to feel alive without demanding attention.
  */
  idle: {
    colors: [
      '#0b1020', // midnight blue
      '#243b53', // slate blue
      '#315c4c', // deep teal
      '#6b5b3e', // muted bronze
      '#7c6f9f', // dusty violet
      '#a39b72', // soft khaki
    ],
    speed: 0.6,
  },

  /*
    Working — energetic and high-contrast.
    Moves through electric yellow, orange, pink, violet and cyan
    so it feels active rather than simply "more yellow."
  */
  thinking: {
    colors: [
      '#ffe500', // electric yellow
      '#ff8a00', // vivid orange
      '#ff3d81', // hot pink
      '#9b5cff', // electric violet
      '#27d7ff', // cyan
      '#7dffb3', // mint
    ],
    speed: 2,
  },

  /*
    Finished — bright, satisfying and slightly softer than thinking.
    Feels like a little celebratory aurora rather than another warning state.
  */
  done: {
    colors: [
      '#f7e967', // warm gold
      '#73e2a7', // fresh green
      '#45caff', // sky cyan
      '#8b7cff', // lavender blue
      '#ff8ec7', // soft pink
      '#f4b860', // amber
    ],
    speed: 1,
  },

  /*
    Jammed — hostile, bruised and overheated.
    Red remains dominant, but purple/magenta/orange give it more depth.
  */
  failed: {
    colors: [
      '#190b1f', // near-black purple
      '#5b163f', // bruised magenta
      '#a51c48', // crimson
      '#ff4141', // alarm red
      '#ff7043', // hot orange
      '#ff9f7a', // pale coral
    ],
    speed: 0.5,
  },
};

const LABELS = {
  idle: 'Engine idle',
  thinking: 'Engine refining',
  done: 'Engine finished',
  failed: 'Engine failed',
}

/*
  Long enough to read as the core changing its mind rather than being swapped
  out, short enough that a failure is not still resolving while you read the
  error.
*/
const TRANSITION_MS = 700

/* ---- Colour maths ---------------------------------------------------- */

/*
  Mixing happens in linear light, not in sRGB. Straight byte interpolation
  between two saturated hues dips through a desaturated middle — the olive-to-
  red transition in particular passes through a dead brown that looks like a
  third state nobody asked for.
*/
function srgbToLinear(byte) {
  const channel = byte / 255
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value) {
  const channel = value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055

  return Math.round(Math.min(1, Math.max(0, channel)) * 255)
}

function parseHex(hex) {
  const int = Number.parseInt(hex.slice(1), 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function mixHex(from, to, t) {
  const a = parseHex(from)
  const b = parseHex(to)

  const channels = [0, 1, 2].map((i) => {
    const linear = srgbToLinear(a[i]) + (srgbToLinear(b[i]) - srgbToLinear(a[i])) * t
    return linearToSrgb(linear).toString(16).padStart(2, '0')
  })

  return `#${channels.join('')}`
}

/* ---- Hooks ------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return undefined

    const onChange = (event) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/*
  Drives colour and rate from wherever they currently are to wherever the new
  state wants them, rather than from the outgoing state's resting values — so a
  status that changes mid-transition bends the curve instead of snapping back
  and starting again.

  Rate is tweened alongside colour because the mount accumulates its own clock
  (`currentFrame += dt * speed`), which means a change in speed is continuous:
  it reads as the core spinning up or settling, never as a jump in the pattern.
*/
function useTransition(status, instant) {
  const target = STATES[status] ?? STATES.idle
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    if (instant) return undefined

    const from = shownRef.current
    const start = performance.now()
    let raf = 0

    const step = (now) => {
      const linear = Math.min(1, (now - start) / TRANSITION_MS)
      // Smoothstep: eases both ends, so the core neither lurches into the
      // change nor arrives at a hard stop.
      const t = linear * linear * (3 - 2 * linear)

      /*
        Driven off the target's length, falling back to the target colour where
        the outgoing palette is shorter. Mapping the source instead would hand
        mixHex an undefined partner the moment the palettes fell out of step,
        and that surfaces as NaN in the hex rather than as an obvious mistake.
      */
      const next = {
        colors: target.colors.map((color, i) => mixHex(from.colors[i] ?? color, color, t)),
        speed: from.speed + (target.speed - from.speed) * t,
      }

      shownRef.current = next
      setShown(next)

      if (linear < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [status, instant, target])

  /*
    While motion is suppressed nothing animates, so the record of what is on
    screen has to be kept by hand — otherwise turning the preference off
    mid-session would start the next transition from a colour that stopped being
    displayed several states ago.
  */
  useEffect(() => {
    if (instant) shownRef.current = target
  }, [instant, target])

  return instant ? target : shown
}

/* ---- Component -------------------------------------------------------- */

export default function EngineCore({ status = 'idle' }) {
  const reduced = usePrefersReducedMotion()
  const shown = useTransition(status, reduced)

  return (
    /*
      The casing wears the current mid colour, so a machine without WebGL gets a
      solid block that still tracks the state instead of a hole in the row.
    */
    <div
      className="engine-core"
      style={{ background: shown.colors[1] }}
      role="img"
      aria-label={LABELS[status] ?? LABELS.idle}
    >
      <MeshGradient
        width="100%"
        height="100%"
        colors={shown.colors}
        // Frozen rather than hidden: the gradient still reads as a state, it
        // just stops moving.
        speed={reduced ? 0 : shown.speed}
        {...FORM}
      />
    </div>
  )
}
