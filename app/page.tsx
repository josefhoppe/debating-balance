import Simulator from './simulator'

export default function Home() {
  return (
    <main className="flex flex-col flex-1 w-full max-w-4xl mx-auto gap-6 py-12 px-6">
      <h1 className="text-2xl font-semibold">Debate tournament position balance</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Null-hypothesis distribution of team points per position, assuming every room result is
        uniformly random.
      </p>
      <Simulator />
    </main>
  )
}
