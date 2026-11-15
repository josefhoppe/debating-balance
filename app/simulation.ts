export type Points = 0 | 1 | 2 | 3
export const POINTS = [0,1,2,3]

export type Result = [Points, Points, Points, Points]
export const POSSIBLE_RESULTS: Result[] = [[0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3], [1, 2, 3, 0], [1, 3, 0, 2], [1, 3, 2, 0], [2, 0, 1, 3], [2, 0, 3, 1], [2, 1, 0, 3], [2, 1, 3, 0], [2, 3, 0, 1], [2, 3, 1, 0], [3, 0, 1, 2], [3, 0, 2, 1], [3, 1, 0, 2], [3, 1, 2, 0], [3, 2, 0, 1], [3, 2, 1, 0]]
export const RESULT_POSITIONS = ["OG", "OO", "CG", "CO"]

export type RoundStatistics = {
    og: number,
    oo: number,
    cg: number,
    co: number,
    best: number,
    bestName: string,
    worst: number,
    worstName: string,
    bestTwo: number,
    bestTwoName: string,
}

export function randomRound(rooms: number): Result[] {
    var result: Result[] = []
    for (let i = 0; i < rooms; i++) {
        result.push(POSSIBLE_RESULTS[Math.floor(Math.random() * POSSIBLE_RESULTS.length)])
    }
    return result
}

const pairPositions = ['First', 'Second', 'Gov', 'Opp', 'Long', 'Short']

export function calcStatistics(round: Result[]): RoundStatistics {
    var result: RoundStatistics = {
        og: 0,
        oo: 0,
        cg: 0,
        co: 0,
        best: 0,
        worst: 0,
        bestTwo: 0,
        bestName: "",
        worstName: "",
        bestTwoName: ""
    }

    for (let i = 0; i < round.length; i++) {
        const room = round[i];
        result.og += room[0]
        result.oo += room[1]
        result.cg += room[2]
        result.co += room[3]
    }

    fillStatistics(result)

    return result
}

export function simulateRound(rooms: number, runs: number): RoundStatistics[] {
    let result: RoundStatistics[] = []
    for (let i = 0; i < runs; i++) {
        let round = randomRound(rooms)
        result.push(calcStatistics(round))
    }
    return result
}

export function fillStatistics(stats: RoundStatistics) {
    let singleResults = [stats.og, stats.oo, stats.cg, stats.co]
    stats.best = Math.max(...singleResults)
    stats.bestName = RESULT_POSITIONS[singleResults.indexOf(stats.best)]
    stats.worst = Math.min(...singleResults)
    stats.worstName = RESULT_POSITIONS[singleResults.indexOf(stats.worst)]

    let pairSums = [stats.og + stats.oo, stats.cg + stats.co, stats.og + stats.cg, stats.oo + stats.co, stats.og + stats.co, stats.oo + stats.cg]
    stats.bestTwo = Math.max(...pairSums)
    stats.bestTwoName = pairPositions[pairSums.indexOf(stats.bestTwo)]
}

