'use client'

import { useEffect, useRef } from 'react'

export type Tail = 'upper' | 'lower'

const ALPHA = 0.05
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

/** One-sided p-value of an observed total, in the direction of the rejection region. */
export function pValue(data: HistogramData, tail: Tail, observed: number): number {
  let sum = 0
  data.values.forEach((v, i) => {
    if (tail === 'upper' ? v >= observed : v <= observed) sum += data.percents[i]
  })
  return sum / 100
}

export type Observed = {
  /** Observed total points. */
  value: number
  /** Name of the position(s) that achieved it. */
  name: string
}

type Props = {
  title: string
  xLabel: string
  tail: Tail
  data: HistogramData
  /** Number of rooms; x labels show total points divided by this (average per room). */
  rooms: number
  observed?: Observed
}

function formatAvg(total: number, rooms: number): string {
  return Number((total / rooms).toFixed(2)).toString()
}

export default function Histogram({ title, xLabel, tail, data, rooms, observed }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const obsValue = observed?.value
  const obsName = observed?.name

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
        marker: { color: data.rejected.map((r) => (r ? RED : BLUE)) },
        customdata: data.values.map((v, i) => [
          formatAvg(v, rooms),
          data.rejected[i] ? 'rejection region' : '',
        ]),
        hovertemplate: `avg ${xLabel} = %{customdata[0]} (total %{x})<br>%{y:.3f}%<br>%{customdata[1]}<extra></extra>`,
      }
      const traces: Plotly.Data[] = [trace]
      if (obsValue !== undefined) {
        // A vertical line built from many points so hovering anywhere along it shows the label.
        const top = Math.max(...data.percents) * 1.05
        const n = 30
        const ys = Array.from({ length: n + 1 }, (_, i) => (top * i) / n)
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: ys.map(() => obsValue),
          y: ys,
          line: { color: '#111', width: 2, dash: 'dash' },
          hovertemplate: `Observed: ${obsName}<br>avg ${xLabel} = ${formatAvg(obsValue, rooms)} (total ${obsValue})<extra></extra>`,
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
        margin: { t: 50, r: 20, b: 50, l: 70 },
        showlegend: false,
        hovermode: 'closest',
      }
      Plotly.react(el, traces, layout, { responsive: true, displaylogo: false })
    })
    return () => {
      cancelled = true
    }
  }, [title, xLabel, data, rooms, obsValue, obsName])

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

  const observedText =
    observed &&
    `Observed: ${observed.name} with ${formatAvg(observed.value, rooms)} on average (total ${observed.value}), one-sided p = ${(pValue(data, tail, observed.value) * 100).toFixed(2)}%.`

  return (
    <section className="w-full">
      <div ref={ref} className="w-full h-[400px]" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400 px-2">{tailText}</p>
      {observedText && <p className="text-sm font-medium px-2">{observedText}</p>}
    </section>
  )
}
