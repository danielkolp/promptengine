/*
  A light that runs around the edge of something while it is being worked on.

  Adapted from the react-bits StarBorder, which is a wrapper: it owns its
  child's background, padding and a 20px radius. That shape cannot be used here.
  The tag tiles already carry their own header, textarea, hue and hard offset,
  and wrapping one would have meant handing all of that to a component whose job
  is a lighting effect. The radius alone would have broken the system, which has
  none anywhere. So it renders as an overlay instead and paints nothing but the
  light.

  It is built from two copies of the same ring rather than one:

    bloom   blurred, underneath, unclipped — the halo thrown onto whatever
            surrounds the tile
    ring    crisp, on top — the filament itself

  That pairing is what makes it read as emission. A single ring, however bright,
  is a coloured line sitting on the border; light is a hot core plus falloff, and
  the falloff has to land on the surroundings or the eye reads it as paint.

  The blur has to come from a parent of the masked ring, not from the ring. CSS
  applies filter before mask, so a drop-shadow on the ring itself is generated
  and then immediately clipped away by the very mask that shapes it.

  The travelling light is a conic gradient turning through 360°, not an element
  sliding along the edge. A sliding element needs a clipping box to stay on the
  tile, and that box is exactly what stops the halo escaping.
*/
export default function StarBorder({
  color = 'var(--tag, var(--ink))',
  speed = '1.8s',
  delay = '0s',
  thickness = 2,
}) {
  return (
    <span
      className="star-border"
      aria-hidden="true"
      style={{
        '--star-color': color,
        '--star-speed': speed,
        '--star-delay': delay,
        '--star-thickness': `${thickness}px`,
      }}
    >
      <span className="star-border__bloom">
        <span className="star-border__ring" />
      </span>
      <span className="star-border__ring" />
    </span>
  )
}
