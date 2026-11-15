'use client'

import { useMemo, useRef, useState } from 'react'
import Histogram, { buildHistogram, HistogramData, Observed } from './histogram'
import { RoundStatistics, simulateRound } from './simulation'
import { ImportedRound, parseTabbycat } from './tabbycat'

type Results = {
  rooms: number
  runs: number
  best: HistogramData
  worst: HistogramData
  bestTwo: HistogramData
}

type Round = {
  name: string
  /** Style slot, assigned at import and kept so a round's color never changes. */
  slot: number
  data: ImportedRound
}

const POSITIONS: { key: keyof Pick<RoundStatistics, 'og' | 'oo' | 'cg' | 'co'>; label: string }[] = [
  { key: 'og', label: 'OG' },
  { key: 'oo', label: 'OO' },
  { key: 'cg', label: 'CG' },
  { key: 'co', label: 'CO' },
]

// Colorblind-checked categorical palette, excluding the blue/red used by the bars.
const ROUND_COLORS = ['#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']
// After all colors are used once, the colors repeat with a different dash pattern.
const ROUND_DASHES = ['solid', 'dash', 'dot', 'dashdot']

function roundStyle(slot: number) {
  return {
    color: ROUND_COLORS[slot % ROUND_COLORS.length],
    dash: ROUND_DASHES[Math.floor(slot / ROUND_COLORS.length) % ROUND_DASHES.length],
  }
}

export default function Simulator() {
  const [rooms, setRooms] = useState(6)
  const [runs, setRuns] = useState(100_000)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [importName, setImportName] = useState('')
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const isValid = (r: number) => Number.isInteger(r) && r >= 1 && Number.isInteger(runs) && runs >= 1
  const valid = isValid(rooms)
  const roomsLocked = rounds.length > 0

  function simulate(roomCount = rooms) {
    if (!isValid(roomCount)) return
    setRunning(true)
    // Yield to the browser so the "Simulating…" state renders before the blocking run.
    setTimeout(() => {
      const stats = simulateRound(roomCount, runs)
      setResults({
        rooms: roomCount,
        runs,
        best: buildHistogram(stats.map((s) => s.best), 'upper'),
        worst: buildHistogram(stats.map((s) => s.worst), 'lower'),
        bestTwo: buildHistogram(stats.map((s) => s.bestTwo), 'upper'),
      })
      setRunning(false)
    }, 0)
  }

  const nameTaken = (name: string) =>
    rounds.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())

  function openImport() {
    let n = rounds.length + 1
    while (nameTaken(`Round ${n}`)) n++
    setImportName(`Round ${n}`)
    setImportError(null)
    dialogRef.current?.showModal()
  }

  function submitImport() {
    const name = importName.trim()
    if (name === '') return setImportError('Please enter a name for the round.')
    if (nameTaken(name)) return setImportError(`A round named "${name}" already exists.`)

    let data: ImportedRound
    try {
      data = parseTabbycat(importText)
    } catch (e) {
      return setImportError(e instanceof Error ? e.message : String(e))
    }
    if (rounds.length > 0 && data.rooms !== rounds[0].data.rooms) {
      return setImportError(
        `This round has ${data.rooms} rooms, but the imported rounds have ${rounds[0].data.rooms}. ` +
          'All rounds must have the same number of rooms; remove the existing rounds to switch.',
      )
    }

    const used = new Set(rounds.map((r) => r.slot))
    let slot = 0
    while (used.has(slot)) slot++
    setRounds([...rounds, { name, slot, data }])
    setRooms(data.rooms)
    setImportText('')
    dialogRef.current?.close()
    if (!results || results.rooms !== data.rooms) simulate(data.rooms)
  }

  function removeRound(name: string) {
    setRounds(rounds.filter((r) => r.name !== name))
  }

  const observed = useMemo(() => {
    const visible = results ? rounds.filter((r) => r.data.rooms === results.rooms) : []
    const make = (pick: (s: RoundStatistics) => { value: number; name: string }): Observed[] =>
      visible.map((r) => ({ round: r.name, ...roundStyle(r.slot), ...pick(r.data.stats) }))
    return {
      best: make((s) => ({ value: s.best, name: s.bestName })),
      worst: make((s) => ({ value: s.worst, name: s.worstName })),
      bestTwo: make((s) => ({ value: s.bestTwo, name: s.bestTwoName })),
    }
  }, [rounds, results])

  return (
    <div className="flex flex-col gap-6 w-full">
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          simulate()
        }}
      >
        <label className="flex flex-col text-sm gap-1">
          Rooms
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isNaN(rooms) ? '' : rooms}
            onChange={(e) => setRooms(e.target.valueAsNumber)}
            disabled={roomsLocked}
            title={roomsLocked ? 'Remove all imported rounds to change the number of rooms.' : undefined}
            className="border rounded px-2 py-1 w-32 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          Simulations
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isNaN(runs) ? '' : runs}
            onChange={(e) => setRuns(e.target.valueAsNumber)}
            className="border rounded px-2 py-1 w-40"
          />
        </label>
        <button
          type="submit"
          disabled={!valid || running}
          className="rounded bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50"
        >
          {running ? 'Simulating…' : 'Simulate'}
        </button>
        <button type="button" onClick={openImport} className="rounded border px-4 py-1.5">
          Import data
        </button>
      </form>

      {rounds.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Imported rounds ({rounds[0].data.rooms} rooms each; remove all rounds to change the number of
            rooms). Mean points per position:
          </p>
          <table className="text-sm border-collapse w-fit">
            <thead>
              <tr className="text-zinc-600 dark:text-zinc-400">
                <th className="text-left font-normal px-3 py-1">Round</th>
                {POSITIONS.map(({ key, label }) => (
                  <th key={key} className="text-right font-normal px-3 py-1">
                    {label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.name} className="border-t">
                  <td className="px-3 py-1">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: roundStyle(r.slot).color }}
                      />
                      {r.name}
                    </span>
                  </td>
                  {POSITIONS.map(({ key }) => (
                    <td key={key} className="text-right tabular-nums px-3 py-1">
                      {(r.data.stats[key] / r.data.rooms).toFixed(2)}
                    </td>
                  ))}
                  <td className="px-3 py-1">
                    <button
                      type="button"
                      onClick={() => removeRound(r.name)}
                      className="rounded border px-2 py-0.5 text-xs"
                      aria-label={`Remove ${r.name}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-3xl rounded p-6 backdrop:bg-black/40"
        onClose={() => setImportError(null)}
      >
        <form
          method="dialog"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            submitImport()
          }}
        >
          <h2 className="text-lg font-semibold">Import Tabbycat results</h2>
          <label className="flex flex-col text-sm gap-1">
            Round name
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              className="border rounded px-2 py-1 w-64"
            />
          </label>
          <p className="text-sm text-zinc-600">
            Paste the tab- or comma-separated results of one round, including the header row. The columns{' '}
            <code>result</code> and <code>side</code> are used.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={16}
            className="border rounded p-2 font-mono text-xs w-full"
            placeholder={'team\tresult\tside\tadjudicators\n…'}
          />
          {importError && <p className="text-sm text-red-700">{importError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded border px-4 py-1.5">
              Cancel
            </button>
            <button type="submit" className="rounded bg-blue-600 text-white px-4 py-1.5">
              Submit
            </button>
          </div>
        </form>
      </dialog>

      {results && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {results.runs.toLocaleString()} simulated rounds with {results.rooms} room
            {results.rooms === 1 ? '' : 's'}. Red bars mark the 5% rejection region
            {observed.best.length > 0 ? '; colored lines mark the imported rounds' : ''}.
          </p>
          <Histogram
            title="Best position (max points)"
            xLabel="best"
            tail="upper"
            data={results.best}
            rooms={results.rooms}
            observed={observed.best}
          />
          <Histogram
            title="Worst position (min points)"
            xLabel="worst"
            tail="lower"
            data={results.worst}
            rooms={results.rooms}
            observed={observed.worst}
          />
          <Histogram
            title="Best pair of positions (max points)"
            xLabel="bestTwo"
            tail="upper"
            data={results.bestTwo}
            rooms={results.rooms}
            observed={observed.bestTwo}
          />
        </>
      )}
    </div>
  )
}
