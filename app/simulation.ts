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

    let singleResults = [result.og, result.oo, result.cg, result.co]
    result.best = Math.max(...singleResults)
    result.bestName = RESULT_POSITIONS[singleResults.indexOf(result.best)]
    result.worst = Math.min(...singleResults)
    result.worstName = RESULT_POSITIONS[singleResults.indexOf(result.worst)]

    let pairSums = [result.og + result.oo, result.cg + result.co, result.og + result.cg, result.oo + result.co, result.og + result.co, result.oo + result.cg]
    result.bestTwo = Math.max(...pairSums)
    result.bestTwoName = pairPositions[pairSums.indexOf(result.bestTwo)]

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

