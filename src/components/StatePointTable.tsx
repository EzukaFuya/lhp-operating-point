/**
 * The state-point table. Rows take part in the same selection as the
 * figures: hover previews, click or Enter pins.
 */

import type { JSX } from 'react'
import { COL } from '../model/constants'
import { pointList, type Solution } from '../model/solve'
import type { SelectionHandlers } from '../charts/primitives'

const TH: React.CSSProperties = { textAlign: 'left', padding: '0 0 7px' }
const TH_NUM: React.CSSProperties = { textAlign: 'right', padding: '0 0 7px' }
const TD_NUM: React.CSSProperties = { textAlign: 'right' }

interface Props {
  r: Solution
  /** The previewed or pinned point. */
  active: string | null
  /** The pinned point, which reads stronger than a preview. */
  pinned: string | null
  H: SelectionHandlers
}

export function StatePointTable({ r, active, pinned, H }: Props): JSX.Element {
  const P = pointList(r)

  const bg = (id: string) =>
    pinned === id ? '#d5ebe2' : active === id ? '#e4f2ec' : 'transparent'

  /** Point 9 has no physical pressure once ΔP_WICK exceeds the CC pressure. */
  const press = (id: string, p: number) => (id === '9' && r.nonphys ? 'n/a' : p.toFixed(4))

  const idFromEvent = (ev: React.SyntheticEvent): string | null => {
    const t = ev.target as HTMLElement | null
    const tr = t && t.closest ? t.closest('tr') : null
    return tr ? tr.getAttribute('data-pt') : null
  }

  return (
    <table
      onMouseLeave={() => H.onHover(null)}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
      }}
    >
      <thead>
        <tr
          style={{
            borderBottom: '1px solid #33302a',
            color: '#5c5648',
            fontSize: 10,
            letterSpacing: '0.08em',
          }}
        >
          <th style={{ ...TH, width: 34 }}>#</th>
          <th style={TH}>STATE</th>
          <th style={{ ...TH_NUM, width: 58 }}>T r</th>
          <th style={{ ...TH_NUM, width: 66 }}>P r</th>
          <th style={{ ...TH_NUM, width: 56 }}>s *</th>
        </tr>
      </thead>
      <tbody
        onClick={(ev) => {
          const id = idFromEvent(ev)
          if (id) H.onPick(id)
        }}
        onKeyDown={(ev) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return
          const id = idFromEvent(ev)
          if (id) {
            ev.preventDefault()
            H.onPick(id)
          }
        }}
      >
        {P.map((p, i) => {
          // 2′ is a construction point, so it is set in the muted ink rather
          // than the colour of a branch it does not belong to.
          const construction = p.id === '2′'
          return (
            <tr
              key={p.id}
              data-pt={p.id}
              tabIndex={0}
              onMouseEnter={() => H.onHover(p.id)}
              style={{
                borderBottom: i === P.length - 1 ? undefined : '1px solid #ece7de',
                cursor: 'pointer',
                background: bg(p.id),
              }}
            >
              <td
                style={{
                  padding: '9px 0',
                  color: construction ? COL.faint : COL[p.br],
                  fontWeight: construction ? undefined : 600,
                }}
              >
                {p.id}
              </td>
              <td style={{ padding: '9px 0' }}>
                {construction ? (
                  <>
                    Saturation state at P<sub>2</sub>
                  </>
                ) : (
                  p.name
                )}
              </td>
              <td style={TD_NUM}>{p.t.toFixed(3)}</td>
              <td style={TD_NUM}>{press(p.id, p.p)}</td>
              <td style={TD_NUM}>{p.s.toFixed(2)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
