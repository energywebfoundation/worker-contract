type Match = Record<string, unknown>;

export type MatchingResult = {
    matches: Match[];
    leftoverEntities: [Match[], Match[]];
}

export type HashMatchingResultFunction = (matchingResult: MatchingResult) => { root: string, verify: (leaf: string) => boolean }