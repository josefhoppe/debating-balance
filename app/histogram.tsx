'use client'

import { useEffect, useRef } from 'react'

export type Tail = 'upper' | 'lower'

export const ALPHA = 0.05
const BLUE = '#2a6fdb'
const RED = '#d62728'

export type HistogramData = {
  values: number[]
  percents: number[]
  rejected: boolean[]
  /** Least extreme value that is still in the rejection region (undefined if none). */
  critical?: number
  /** Actual size of the rejection region (≤ ALPHA). */
  criticalMass: number
}

/**
 * Builds a histogram over integer values and marks the one-sided rejection region.
 * Conservative: a value is rejected only if its tail probability is ≤ ALPHA.
 */
export function buildHistogram(samples: number[], tail: Tail): HistogramData {
  const counts = new Map<number, number>()
  for (const s of samples) counts.set(s, (counts.get(s) ?? 0) + 1)
  const values = [...counts.keys()].sort((a, b) => a - b)
  const n = samples.length
  const probs = values.map((v) => counts.get(v)! / n)

  const rejected = new Array<boolean>(values.length).fill(false)
  let cumulative = 0
  let critical: number | undefined
  let criticalMass = 0
  const order = tail === 'upper' ? [...values.keys()].reverse() : [...values.keys()]
  for (const i of order) {
    cumulative += probs[i]
    if (cumulative > ALPHA + 1e-12) break
    rejected[i] = true
    critical = values[i]
    criticalMass = cumulative
  }

  return { values, percents: probs.map((p) => p * 100), rejected, critical, criticalMass }
}

/**
 * Benjamini-Hochberg adjusted p-values, in the same order as the input.
 * A hypothesis is rejected at FDR level α iff its adjusted p-value is ≤ α.
 */
export function benjaminiHochberg(pValues: number[]): number[] {
  const m = pValues.length
  const order = [...pValues.keys()].sort((a, b) => pValues[a] - pValues[b])
  const adjusted = new Array<number>(m)
  let min = 1
  for (let rank = m; rank >= 1; rank--) {
    const i = order[rank - 1]
    min = Math.min(min, (pValues[i] * m) / rank)
    adjusted[i] = min
  }
  return adjusted
}

/** One-sided p-value of an observed total, in the direction of the rejection region. */
export function pValue(data: HistogramData, tail: Tail, observed: number): number {
  let sum = 0
  data.values.forEach((v, i) => {
    if (tail === 'upper' ? v >= observed : v <= observed) sum += data.percents[i]
  })
  return sum / 100
}

export type Observed = {
  /** Name of the imported round (legend label). */
  round: string
  /** Observed total points. */
  value: number
  /** Name of the position(s) that achieved it. */
  name: string
  color: string
  dash: string
  /** Raw one-sided p-value. */
  p: number
  /** Benjamini-Hochberg adjusted p-value across all tests of all imported rounds. */
  pAdjusted: number
}

type Props = {
  title: string
  xLabel: string
  tail: Tail
  data: HistogramData
  /** Number of rooms; x labels show total points divided by this (average per room). */
  rooms: number
  /** Imported rounds to overlay as vertical lines. Pass a stable (memoized) array. */
  observed: Observed[]
}

function formatAvg(total: number, rooms: number): string {
  return Number((total / rooms).toFixed(2)).toString()
}

export default function Histogram({ title, xLabel, tail, data, rooms, observed }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const el = ref.current
    // Keep one bar per total; thin out tick labels so they don't collide.
    const step = Math.ceil(data.values.length / 20)
    const tickVals = data.values.filter((_, i) => i % step === 0)
    import('plotly.js-dist-min').then((Plotly) => {
      if (cancelled || !el) return
      const trace: Plotly.Data = {
        type: 'bar',
        x: data.values,
        y: data.percents,
        showlegend: false,
        marker: { color: data.rejected.map((r) => (r ? RED : BLUE)) },
        customdata: data.values.map((v, i) => [
          formatAvg(v, rooms),
          data.rejected[i] ? 'rejection region' : '',
        ]),
        hovertemplate: `avg ${xLabel} = %{customdata[0]} (total %{x})<br>%{y:.3f}%<br>%{customdata[1]}<extra></extra>`,
      }
      const traces: Plotly.Data[] = [trace]
      // Vertical lines built from many points so hovering anywhere along them shows the label.
      const top = Math.max(...data.percents) * 1.05
      const n = 30
      const ys = Array.from({ length: n + 1 }, (_, i) => (top * i) / n)
      // Rounds with the same value would hide each other, so spread them across the bar's width.
      const sameValue = new Map<number, number>()
      for (const o of observed) sameValue.set(o.value, (sameValue.get(o.value) ?? 0) + 1)
      const seen = new Map<number, number>()
      for (const o of observed) {
        const count = sameValue.get(o.value)!
        const k = seen.get(o.value) ?? 0
        seen.set(o.value, k + 1)
        const spacing = Math.min(0.15, 0.8 / count)
        const x = o.value + (k - (count - 1) / 2) * spacing
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: o.round,
          x: ys.map(() => x),
          y: ys,
          line: { color: o.color, width: 3, dash: o.dash as Plotly.Dash },
          hovertemplate: `${o.round}: ${o.name}<br>avg ${xLabel} = ${formatAvg(o.value, rooms)} (total ${o.value})<extra></extra>`,
        })
      }
      const layout: Partial<Plotly.Layout> = {
        title: { text: title },
        xaxis: {
          title: { text: `Average ${xLabel} points per room` },
          tickmode: 'array',
          tickvals: tickVals,
          ticktext: tickVals.map((v) => formatAvg(v, rooms)),
        },
        yaxis: { title: { text: 'Share of simulations' }, ticksuffix: '%', rangemode: 'tozero' },
        bargap: 0.1,
        margin: { t: 80, r: 20, b: 50, l: 70 },
        showlegend: observed.length > 0,
        legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom' },
        hovermode: 'closest',
      }
      Plotly.react(el, traces, layout, { responsive: true, displaylogo: false })
    })
    return () => {
      cancelled = true
    }
  }, [title, xLabel, data, rooms, observed])

  useEffect(() => {
    const el = ref.current
    return () => {
      if (el) import('plotly.js-dist-min').then((Plotly) => Plotly.purge(el))
    }
  }, [])

  const tailText =
    data.critical === undefined
      ? 'No value is extreme enough to reject at 5%.'
      : `Reject H₀ if ${xLabel} ${tail === 'upper' ? '≥' : '≤'} ${formatAvg(data.critical, rooms)} on average (total ${data.critical}; actual level ${(data.criticalMass * 100).toFixed(2)}%).`


  return (
    <section className="w-full">
      <div ref={ref} className="w-full h-[400px]" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400 px-2">{tailText}</p>
      {observed.length > 0 && (
        <ul className="text-sm px-2 mt-1">
          {observed.map((o) => (
            <li key={o.round} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: o.color }} />
              <span>
                <span className="font-medium">{o.round}:</span> {o.name} with {formatAvg(o.value, rooms)} on
                average (total {o.value}), one-sided p = {(o.p * 100).toFixed(2)}%, BH-adjusted p ={' '}
                {(o.pAdjusted * 100).toFixed(2)}%.
              </span>
              {o.pAdjusted <= ALPHA && (
                <span className="rounded-full bg-red-100 text-red-600 font-bold text-xs px-2 py-0.5">
                  significant
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
