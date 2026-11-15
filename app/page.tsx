import Simulator from './simulator'

export default function Home() {
  return (
    <main className="flex flex-col flex-1 w-full max-w-4xl mx-auto gap-6 py-12 px-6">
      <h1 className="text-2xl font-semibold">Debate Tournament Position Balance Simulator</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        <a href='https://github.com/josefhoppe/debating-balance/' className='text-red-600'>Code on Github</a> (GNU AGPL-3.0)
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">
        Null-hypothesis distribution of team points per position, assuming every room result is
        uniformly random. Click <i>import data</i> to compare to results from Tabbycat.
      </p>
      <Simulator />
    </main>
  )
}
