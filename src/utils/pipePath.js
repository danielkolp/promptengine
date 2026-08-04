// How far outside the grid the return runs sit, in px.
export const EDGE_PAD = 8

/*
  Routes one continuous pipe along the underside of every tag tile and down
  into the prompt box.

  Pure geometry on purpose: the DOM measuring lives in FlowPipe, so the routing
  can be exercised directly against synthetic layouts.

  `rects` are tile boxes in overlay coordinates ({ left, right, bottom }), in
  tag order. `target` is the prompt box ({ left, top }).
*/
export function buildPipePath(rects, target) {
  if (!rects || rects.length === 0 || !target) return { d: '', points: [] }

  // Tiles sharing a bottom edge form one course of the wall.
  const rows = []
  rects.forEach((rect) => {
    const row = rows.find((candidate) => Math.abs(candidate.y - rect.bottom) < 2)

    if (row) {
      row.items.push(rect)
    } else {
      rows.push({ y: rect.bottom, items: [rect] })
    }
  })
  rows.sort((a, b) => a.y - b.y)

  const gridLeft = Math.min(...rects.map((rect) => rect.left))
  const gridRight = Math.max(...rects.map((rect) => rect.right))

  // Serpentine: alternate direction per course so the run stays continuous and
  // every turn happens outside the grid instead of across a tile.
  const points = []
  rows.forEach((row, index) => {
    const leftToRight = index % 2 === 0
    const from = leftToRight ? gridLeft - EDGE_PAD : gridRight + EDGE_PAD
    const to = leftToRight ? gridRight + EDGE_PAD : gridLeft - EDGE_PAD

    points.push([from, row.y], [to, row.y])
  })

  const entryX = target.left + 26
  const approachY = target.top - 7
  const lastX = points[points.length - 1][0]

  // Drop to just above the prompt box, cross to the inlet, then plunge in.
  points.push([lastX, approachY], [entryX, approachY], [entryX, target.top + 7])

  const d = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')

  // Vertices come back too so the overlay can bolt an elbow onto every turn.
  return { d, points }
}
