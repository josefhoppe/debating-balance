'use client'

import { useState } from 'react'
import Histogram, { buildHistogram, HistogramData } from './histogram'
import { simulateRound } from './simulation'

type Results = {
  rooms: number
  runs: number
  best: HistogramData
  worst: HistogramData
  bestTwo: HistogramData
}

export default function Simulator() {
  const [rooms, setRooms] = useState(6)
  const [runs, setRuns] = useState(100_000)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Results | null>(null)

  const valid = Number.isInteger(rooms) && rooms >= 1 && Number.isInteger(runs) && runs >= 1

  function simulate() {
    if (!valid) return
    setRunning(true)
    // Yield to the browser so the "Simulating…" state renders before the blocking run.
    setTimeout(() => {
      const stats = simulateRound(rooms, runs)
      setResults({
        rooms,
        runs,
        best: buildHistogram(stats.map((s) => s.best), 'upper'),
        worst: buildHistogram(stats.map((s) => s.worst), 'lower'),
        bestTwo: buildHistogram(stats.map((s) => s.bestTwo), 'upper'),
      })
      setRunning(false)
    }, 0)
  }

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
      </form>

      {results && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {results.runs.toLocaleString()} simulated rounds with {results.rooms} room
            {results.rooms === 1 ? '' : 's'}. Red bars mark the 5% rejection region.
          </p>
          <Histogram title="Best position (max points)" xLabel="best" tail="upper" data={results.best} rooms={results.rooms} />
          <Histogram title="Worst position (min points)" xLabel="worst" tail="lower" data={results.worst} rooms={results.rooms} />
          <Histogram title="Best pair of positions (max points)" xLabel="bestTwo" tail="upper" data={results.bestTwo} rooms={results.rooms} />
        </>
      )}
    </div>
  )
}
