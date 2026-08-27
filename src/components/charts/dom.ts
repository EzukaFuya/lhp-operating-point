/**
 * A tiny SVG element builder with the same call signature as
 * `React.createElement`, so the figure code reads the same as the design
 * prototype it was verified against — only the output is real DOM rather
 * than a virtual tree.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * SVG attributes that are genuinely camelCase in the specification. Every
 * other camelCase prop is a presentation attribute and gets kebab-cased
 * (`strokeWidth` → `stroke-width`).
 */
const CAMEL_ATTRS = new Set([
  'viewBox',
  'patternUnits',
  'patternContentUnits',
  'patternTransform',
  'gradientUnits',
  'gradientTransform',
  'clipPathUnits',
  'preserveAspectRatio',
  'markerWidth',
  'markerHeight',
  'refX',
  'refY',
  'spreadMethod',
  'startOffset',
  'baseFrequency',
  'stdDeviation',
  'textLength',
  'lengthAdjust',
])

/** Props that are not attributes at all. */
const SKIP = new Set(['key', 'children'])

const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

function attrName(k: string): string {
  if (CAMEL_ATTRS.has(k)) return k
  if (k === 'tabIndex') return 'tabindex'
  if (k.startsWith('data-') || k.startsWith('aria-')) return k
  return kebab(k)
}

export type Child = Node | string | number | null | undefined | false | Child[]

export interface Props {
  [key: string]: unknown
  style?: Partial<CSSStyleDeclaration>
}

function appendChild(el: SVGElement, c: Child): void {
  if (c === null || c === undefined || c === false) return
  if (Array.isArray(c)) {
    c.forEach((x) => appendChild(el, x))
    return
  }
  el.append(c instanceof Node ? c : String(c))
}

/** Create an SVG element. `h('circle', {cx: 1, cy: 2, r: 3})`. */
export function h(tag: string, props?: Props | null, ...children: Child[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag)

  if (props) {
    for (const k of Object.keys(props)) {
      if (SKIP.has(k)) continue
      const v = props[k]
      if (v === null || v === undefined || v === false) continue

      if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v)
        continue
      }
      el.setAttribute(attrName(k), String(v))
    }
  }

  children.forEach((c) => appendChild(el, c))
  return el
}

/** The root `<svg>` of a figure: scales to its container and never clips. */
export function figure(
  opts: { viewBox: string; label: string; chartId?: string },
  children: Child[],
): SVGSVGElement {
  const el = h('svg', {
    viewBox: opts.viewBox,
    role: 'img',
    'aria-label': opts.label,
    'data-chart': opts.chartId,
    style: { width: '100%', height: 'auto', display: 'block', overflow: 'visible' },
  }) as SVGSVGElement
  children.forEach((c) => appendChild(el, c))
  return el
}
