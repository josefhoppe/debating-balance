'use client'

import { useRef, useState } from 'react'
import Histogram, { buildHistogram, HistogramData } from './histogram'
import { RoundStatistics, simulateRound } from './simulation'
import { ImportedRound, parseTabbycat } from './tabbycat'

type Results = {
  rooms: number
  runs: number
  best: HistogramData
  worst: HistogramData
  bestTwo: HistogramData
}

const POSITIONS: { key: keyof Pick<RoundStatistics, 'og' | 'oo' | 'cg' | 'co'>; label: string }[] = [
  { key: 'og', label: 'OG' },
  { key: 'oo', label: 'OO' },
  { key: 'cg', label: 'CG' },
  { key: 'co', label: 'CO' },
]

export default function Simulator() {
  const [rooms, setRooms] = useState(6)
  const [runs, setRuns] = useState(100_000)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const [imported, setImported] = useState<ImportedRound | null>(null)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const isValid = (r: number) => Number.isInteger(r) && r >= 1 && Number.isInteger(runs) && runs >= 1
  const valid = isValid(rooms)

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

  function changeRooms(value: number) {
    setRooms(value)
    // The imported round only makes sense for its own room count.
    if (imported && value !== imported.rooms) setImported(null)
  }

  function openImport() {
    setImportError(null)
    dialogRef.current?.showModal()
  }

  function submitImport() {
    let round: ImportedRound
    try {
      round = parseTabbycat(importText)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
      return
    }
    setImported(round)
    setRooms(round.rooms)
    dialogRef.current?.close()
    if (!results || results.rooms !== round.rooms) simulate(round.rooms)
  }

  const showObserved = imported && results && results.rooms === imported.rooms

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
            onChange={(e) => changeRooms(e.target.valueAsNumber)}
            className="border rounded px-2 py-1 w-32"
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

      {imported && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Imported round with {imported.rooms} room{imported.rooms === 1 ? '' : 's'}. Mean points per
            position:
          </p>
          <div className="grid grid-cols-4 gap-2 max-w-md">
            {POSITIONS.map(({ key, label }) => (
              <div key={key} className="border rounded px-3 py-2 text-center">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
                <div className="text-lg font-semibold">{(imported.stats[key] / imported.rooms).toFixed(2)}</div>
              </div>
            ))}
          </div>
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
          <p className="text-sm text-zinc-600">
            Paste the tab-separated results of one round, including the header row. The columns{' '}
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
            {showObserved ? '; the dashed line marks the imported round' : ''}.
          </p>
          <Histogram
            title="Best position (max points)"
            xLabel="best"
            tail="upper"
            data={results.best}
            rooms={results.rooms}
            observed={showObserved ? { value: imported.stats.best, name: imported.stats.bestName } : undefined}
          />
          <Histogram
            title="Worst position (min points)"
            xLabel="worst"
            tail="lower"
            data={results.worst}
            rooms={results.rooms}
            observed={showObserved ? { value: imported.stats.worst, name: imported.stats.worstName } : undefined}
          />
          <Histogram
            title="Best pair of positions (max points)"
            xLabel="bestTwo"
            tail="upper"
            data={results.bestTwo}
            rooms={results.rooms}
            observed={
              showObserved ? { value: imported.stats.bestTwo, name: imported.stats.bestTwoName } : undefined
            }
          />
        </>
      )}
    </div>
  )
}
