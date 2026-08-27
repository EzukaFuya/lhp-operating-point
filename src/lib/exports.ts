/**
 * CSV and PNG export, and copy-link. Ported from the prototype's
 * dl / doCsv / doPng / doLink.
 */

import { pointList, type Solution } from '../model/solve'
import type { Inputs } from './url'

/** Hand the browser a generated file through a plain anchor download. */
function anchorDownload(name: string, blob: Blob): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/**
 * Offer a generated file to the user.
 *
 * Standalone — dev server, `npm run build`, a saved copy of the single-file
 * build — this is an anchor download. Embedded in a claude.ai artifact,
 * anchor downloads are inert, so the file goes through the viewer's own save
 * prompt instead when that capability is granted.
 */
async function save(name: string, mime: string, data: string | Blob): Promise<void> {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data

  const use = (window as { claude?: { use?: (n: string) => Promise<unknown> } }).claude?.use
  if (typeof use === 'function') {
    try {
      const downloads = (await use('downloads')) as
        | { save: (r: { filename: string; data: Blob }) => Promise<unknown> }
        | null
      if (downloads) {
        try {
          await downloads.save({ filename: name, data: blob })
        } catch (err) {
          // .csv is outside the viewer's base filename allowlist and may not
          // be enabled; the same bytes as .txt are still useful.
          const code = (err as { code?: string } | null)?.code
          if (code === 'extension_not_enabled' && name.endsWith('.csv'))
            await downloads.save({ filename: name.replace(/\.csv$/, '.txt'), data: blob })
          // Anything else — the viewer declined, a prompt was already open —
          // is the viewer's answer, not a failure to report.
        }
        return
      }
    } catch {
      /* capability unreachable — fall through to the anchor */
    }
  }

  anchorDownload(name, blob)
}

/** Every state point plus the pressure and subcooling budgets. */
export function exportCsv(inputs: Inputs, r: Solution): void {
  const P = pointList(r)
  const rows: Array<Array<string | number>> = [
    ['# LHP reduced-property model'],
    ['# Tr_cc', inputs.tcc.toFixed(4)],
    ['# Q*', inputs.q.toFixed(3)],
    ['# Tr_sink', inputs.tsink.toFixed(4)],
    [],
    ['point', 'state', 'Tr', 'Pr', 's*'],
  ]
  P.forEach((p) =>
    rows.push([p.id, '"' + p.name + '"', p.t.toFixed(5), p.p.toFixed(6), p.s.toFixed(4)]),
  )
  rows.push(
    [],
    ['quantity', 'value'],
    ['dPr_dTr', r.dpdt.toFixed(4)],
    ['rho_v*', r.rv.toFixed(4)],
    ['h_fg*', r.hfg.toFixed(4)],
    ['mdot*', r.mdot.toFixed(4)],
    ['dP_GV', r.dpGV.toFixed(6)],
    ['dP_VL', r.dpVL.toFixed(6)],
    ['dP_COND', r.dpCO.toFixed(6)],
    ['dP_LL', r.dpLL.toFixed(6)],
    ['dP_WICK', r.dpWK.toFixed(6)],
    ['dP_cap', r.dpCap.toFixed(6)],
    ['dP_cap_max', r.dpMax.toFixed(6)],
    ['capillary_margin', r.capM.toFixed(4)],
    ['L2phi_over_Lc', r.f.toFixed(4)],
    ['dT_sub_required', r.subReq.toFixed(5)],
    ['dT_sub_available', r.subAv.toFixed(5)],
    ['subcooling_margin', r.subM.toFixed(4)],
  )
  void save('lhp-operating-point.csv', 'text/csv', rows.map((x) => x.join(',')).join('\n'))
}

/** Rasterise the main P–T figure and hand it over as a PNG. */
export function exportPng(): void {
  const svg = document.querySelector('svg[data-chart="main"]')
  if (!svg) return

  const src = new XMLSerializer().serializeToString(svg)
  const img = new Image()
  img.onload = () => {
    const cv = document.createElement('canvas')
    cv.width = 2120
    cv.height = 1080
    const cx = cv.getContext('2d')
    if (!cx) return
    cx.fillStyle = '#faf8f4'
    cx.fillRect(0, 0, cv.width, cv.height)
    cx.drawImage(img, 0, 0, cv.width, cv.height)
    cv.toBlob((b) => {
      if (!b) return
      void save('lhp-pt-diagram.png', 'image/png', b)
    })
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<?xml version="1.0"?>' + src)
}

/** Copy the current URL, hash and all. */
export function copyLink(): void {
  try {
    void navigator.clipboard.writeText(location.href)
  } catch {
    /* ignore — the URL is still in the address bar */
  }
}
