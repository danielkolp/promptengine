import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { buildPipePath } from '../utils/pipePath'

// One full traversal of the pipe. Slow enough to read as something being
// pushed through rather than fired down it.
const CYCLE_MS = 2800
const SVG_NS = 'http://www.w3.org/2000/svg'

/*
  The swell is the pipe itself getting fatter, not a bead riding on top of it.
  SVG can't vary stroke-width along a path, so each layer is the same path
  drawn with a heavier stroke and a dash pattern that exposes exactly one short
  segment. Stacking a short/wide layer over a long/narrow one, both centred on
  the same point, tapers the shoulders; round caps round the ends off.
*/
const SWELL_LAYERS = [
  { ref: 'shoulder', span: 58, width: 14, give: 0.22 },
  { ref: 'peak', span: 26, width: 20, give: 0.34 },
  { ref: 'core', span: 30, width: 8, give: 0.44 },
]

/*
  `stretch` is what makes it read as liquid rather than a capsule on rails: the
  slug lengthens and shortens as it travels, and thins as it stretches the way
  a volume of fluid has to. The core gives the most, so the contents deform
  more than the casing around them.
*/
function setSwell(node, layer, pathLength, distance, stretch) {
  if (!node) return

  const give = 1 + (stretch - 1) * layer.give
  const span = layer.span * give
  // Conserve volume: longer means thinner.
  const width = layer.width / Math.sqrt(give)

  // Inline style, because a CSS rule would outrank a presentation attribute.
  node.style.strokeWidth = width.toFixed(2)
  // One visible dash, then a gap longer than the path so nothing else shows.
  node.setAttribute('stroke-dasharray', `${span.toFixed(1)} ${pathLength + span}`)
  // Centre that dash on `distance` along the path.
  node.setAttribute('stroke-dashoffset', `${(span / 2 - distance).toFixed(1)}`)
}

function rect(parent, { x, y, width, height, className, fill }) {
  const node = document.createElementNS(SVG_NS, 'rect')

  node.setAttribute('x', x.toFixed(1))
  node.setAttribute('y', y.toFixed(1))
  node.setAttribute('width', width)
  node.setAttribute('height', height)
  node.setAttribute('class', className)
  if (fill) node.setAttribute('fill', fill)
  parent.appendChild(node)
}

/*
  Joinery. Without it the pipe is a line lying on top of the blocks; the point
  of the flange is that it wears the brick's own color, so each block reads as
  plumbed into the manifold rather than merely overlapped by it.
*/
function drawHardware(group, rects, tiles, points) {
  if (!group) return

  group.replaceChildren()

  // An elbow on every turn, so direction changes look bolted rather than bent.
  points.forEach(([x, y], index) => {
    if (index === 0 || index === points.length - 1) return

    rect(group, { x: x - 7, y: y - 7, width: 14, height: 14, className: 'pipe-joint' })
    rect(group, { x: x - 2.5, y: y - 2.5, width: 5, height: 5, className: 'pipe-joint-core' })
  })

  // Blank off the head of the run — an uncapped stroke reads as a cut pipe.
  if (points.length >= 2) {
    const [[sx, sy], [nx, ny]] = points
    const runsHorizontal = Math.abs(nx - sx) >= Math.abs(ny - sy)
    const CAP = 7
    const FACE = 24

    if (runsHorizontal) {
      rect(group, {
        x: nx > sx ? sx - CAP : sx,
        y: sy - FACE / 2,
        width: CAP,
        height: FACE,
        className: 'pipe-cap',
      })
      rect(group, { x: sx - (nx > sx ? 4.5 : -1.5), y: sy - 2, width: 3, height: 4, className: 'pipe-cap-core' })
    } else {
      rect(group, {
        x: sx - FACE / 2,
        y: ny > sy ? sy - CAP : sy,
        width: FACE,
        height: CAP,
        className: 'pipe-cap',
      })
      rect(group, { x: sx - 2, y: sy - (ny > sy ? 4.5 : -1.5), width: 4, height: 3, className: 'pipe-cap-core' })
    }
  }

  // A saddle clamp bolted to the underside of each brick.
  rects.forEach((box, index) => {
    const tile = tiles[index]
    if (!tile) return

    const tint = getComputedStyle(tile).getPropertyValue('--tag').trim() || '#ffffff'
    const cx = (box.left + box.right) / 2

    rect(group, {
      x: cx - 16,
      y: box.bottom - 15,
      width: 32,
      height: 21,
      className: 'pipe-flange',
      fill: tint,
    })
    rect(group, { x: cx - 11, y: box.bottom - 11, width: 3, height: 3, className: 'pipe-bolt' })
    rect(group, { x: cx + 8, y: box.bottom - 11, width: 3, height: 3, className: 'pipe-bolt' })
  })
}

/*
  An intake manifold for the tag blocks: one pipe threaded along the underside
  of every tile, snaking row by row and draining into the prompt box.

  The overlay is fully imperative — it writes path geometry straight to the DOM
  rather than holding it in state. Measuring layout into state would re-render
  the whole input on every resize and every keystroke that grows a textarea,
  and nothing in React needs to know these coordinates.
*/
export default function FlowPipe({
  containerRef,
  collectTiles,
  targetRef,
  flowing,
  pulseId,
}) {
  const svgRef = useRef(null)
  const casingRef = useRef(null)
  const boreRef = useRef(null)
  const hardwareRef = useRef(null)
  const swellRef = useRef(null)
  const swellPartsRef = useRef({})
  const flowingRef = useRef(flowing)

  useEffect(() => {
    flowingRef.current = flowing
  }, [flowing])

  const measure = useCallback(() => {
    const container = containerRef.current
    const target = targetRef.current
    const svg = svgRef.current

    if (!container || !target || !svg) return

    const tiles = collectTiles().filter(Boolean)
    const box = container.getBoundingClientRect()
    const style = getComputedStyle(container)

    // Absolutely positioned children are placed against the padding box, so
    // measurements have to drop the border to share the SVG's coordinates.
    const originX = box.left + parseFloat(style.borderLeftWidth)
    const originY = box.top + parseFloat(style.borderTopWidth)
    const width = container.clientWidth
    const height = container.clientHeight

    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    if (tiles.length === 0) {
      casingRef.current?.setAttribute('d', '')
      boreRef.current?.setAttribute('d', '')
      hardwareRef.current?.replaceChildren()
      return
    }

    const rects = tiles.map((tile) => {
      const r = tile.getBoundingClientRect()

      return {
        left: r.left - originX,
        right: r.right - originX,
        bottom: r.bottom - originY,
      }
    })

    const targetBox = target.getBoundingClientRect()
    const { d, points } = buildPipePath(rects, {
      left: targetBox.left - originX,
      top: targetBox.top - originY,
    })

    casingRef.current?.setAttribute('d', d)
    boreRef.current?.setAttribute('d', d)
    SWELL_LAYERS.forEach(({ ref }) => swellPartsRef.current[ref]?.setAttribute('d', d))
    drawHardware(hardwareRef.current, rects, tiles, points)
  }, [collectTiles, containerRef, targetRef])

  useLayoutEffect(() => {
    measure()
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [containerRef, measure])

  // Send a slug through the pipe on refine. It always completes at least one
  // full pass, then keeps looping for as long as the request is still running.
  useEffect(() => {
    if (!pulseId) return undefined

    const casing = casingRef.current
    const swell = swellRef.current
    if (!casing || !swell || !casing.getAttribute('d')) return undefined

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const length = casing.getTotalLength()
    if (!length) return undefined

    let raf = 0
    let startTs = 0

    const step = (ts) => {
      if (!startTs) startTs = ts

      const cycles = (ts - startTs) / CYCLE_MS

      if (cycles >= 1 && !flowingRef.current) {
        swell.style.opacity = '0'
        targetRef.current?.classList.add('pipe-arrived')
        window.setTimeout(() => targetRef.current?.classList.remove('pipe-arrived'), 500)
        return
      }

      const phase = cycles % 1
      // Surge slightly instead of tracking at a constant rate. The amplitude
      // stays well under the linear term, so travel never runs backwards.
      const eased = phase + 0.05 * Math.sin(phase * Math.PI * 4)
      // Run from fully outside the capped end to past the inlet, so the swell
      // enters and leaves the pipe rather than popping into being.
      const travel = -40 + eased * (length + 80)
      const stretch = 1 + 0.3 * Math.sin(phase * Math.PI * 2 * 1.7)

      SWELL_LAYERS.forEach((layer) => {
        setSwell(swellPartsRef.current[layer.ref], layer, length, travel, stretch)
      })

      raf = window.requestAnimationFrame(step)
    }

    swell.style.opacity = '1'
    raf = window.requestAnimationFrame(step)

    return () => {
      window.cancelAnimationFrame(raf)
      swell.style.opacity = '0'
    }
  }, [pulseId, targetRef])

  return (
    <svg ref={svgRef} className="pipe-layer" aria-hidden="true" focusable="false">
      <path ref={casingRef} className="pipe-casing" d="" />
      <path ref={boreRef} className="pipe-bore" d="" />
      <g ref={hardwareRef} />
      <g ref={swellRef} className="pipe-swell" style={{ opacity: 0 }}>
        {SWELL_LAYERS.map(({ ref }) => (
          <path
            key={ref}
            ref={(node) => {
              swellPartsRef.current[ref] = node
            }}
            className={`pipe-swell-${ref}`}
            d=""
          />
        ))}
      </g>
    </svg>
  )
}
