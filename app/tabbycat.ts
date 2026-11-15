import { fillStatistics, RoundStatistics } from './simulation'

const RESULT_POINTS: Record<string, number> = { '1st': 3, '2nd': 2, '3rd': 1, '4th': 0 }

const SIDE_KEYS: Record<string, 'og' | 'oo' | 'cg' | 'co'> = {
  'opening government': 'og',
  'opening opposition': 'oo',
  'closing government': 'cg',
  'closing opposition': 'co',
}

export type ImportedRound = {
  stats: RoundStatistics
  rooms: number
}

/**
 * Splits one CSV row on `sep`, honouring double quotes so that quoted fields may contain
 * the separator (e.g. `"Name A, Name B"`); `""` inside quotes is an escaped quote.
 */
function splitRow(line: string, sep: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        cell += c
      }
    } else if (c === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (c === sep) {
      cells.push(cell)
      cell = ''
    } else {
      cell += c
    }
  }
  cells.push(cell)
  return cells
}

/**
 * Parses results copied from Tabbycat (needs `result` and `side` columns).
 * The separator is detected from the header row: tab if present, otherwise comma.
 */
export function parseTabbycat(text: string): ImportedRound {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) throw new Error('No data found. Paste the header row and at least one result row.')

  const sep = lines[0].includes('\t') ? '\t' : ','
  const header = splitRow(lines[0], sep).map((h) => h.trim().toLowerCase())
  const resultCol = header.indexOf('result')
  const sideCol = header.indexOf('side')
  if (resultCol < 0 || sideCol < 0) {
    throw new Error('Header must contain the columns "result" and "side" (tab or comma separated).')
  }

  const stats: RoundStatistics = {
    og: 0, oo: 0, cg: 0, co: 0,
    best: 0, bestName: '', worst: 0, worstName: '', bestTwo: 0, bestTwoName: '',
  }
  const counts = { og: 0, oo: 0, cg: 0, co: 0 }

  lines.slice(1).forEach((line, i) => {
    const cells = splitRow(line, sep)
    const rawResult = (cells[resultCol] ?? '').trim()
    const rawSide = (cells[sideCol] ?? '').trim()
    const points = RESULT_POINTS[rawResult.toLowerCase()]
    const side = SIDE_KEYS[rawSide.toLowerCase()]
    if (points === undefined) throw new Error(`Line ${i + 2}: unknown result "${rawResult}".`)
    if (side === undefined) throw new Error(`Line ${i + 2}: unknown side "${rawSide}".`)
    stats[side] += points
    counts[side]++
  })

  const rooms = counts.og
  if (counts.oo !== rooms || counts.cg !== rooms || counts.co !== rooms) {
    throw new Error(
      `Each side must appear once per room, but got OG ${counts.og}, OO ${counts.oo}, CG ${counts.cg}, CO ${counts.co}.`,
    )
  }

  fillStatistics(stats)
  return { stats, rooms }
}
