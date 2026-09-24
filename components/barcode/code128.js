/**
 * Code 128 (subset B) encoder — no barcode library exists in this project,
 * and Code 128 is the linear symbology every handheld and camera scanner
 * reads. Returns bar/space module widths; `Code128Svg` draws them.
 *
 * Each symbol is 6 alternating widths (bar, space, …) totalling 11 modules;
 * the stop symbol has 7 (13 modules).
 */
export const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

/** Symbol values for `text` in subset B (printable ASCII 32–126), with checksum. */
export function encodeCode128B(text) {
  const values = [START_B];
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error('Code 128 B supports printable ASCII only');
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  return [...values, checksum, STOP];
}

/** Alternating bar / space module widths, starting with a bar. */
export function code128Modules(text) {
  return encodeCode128B(text).flatMap((v) => PATTERNS[v].split('').map(Number));
}

/**
 * Barcode as an SVG (scales cleanly when printed). `height` and the quiet
 * zone are in modules; the SVG stretches to its container's width.
 */
export function Code128Svg({ value, height = 40, quietZone = 10, className = '', style }) {
  const widths = code128Modules(value);
  const total = widths.reduce((a, b) => a + b, 0) + quietZone * 2;
  let x = quietZone;
  const bars = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={height} />);
    x += w;
  });
  return (
    <svg viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" className={className} style={style} role="img" aria-label={`Barcode ${value}`} shapeRendering="crispEdges">
      <rect x={0} y={0} width={total} height={height} fill="#fff" />
      <g fill="#000">{bars}</g>
    </svg>
  );
}
