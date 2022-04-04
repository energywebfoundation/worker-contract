
type Match = Record<string, string | number | boolean | null | undefined | bigint>;

export type MatchingResult = {
    matches: Match[];
    leftoverEntities: [Match[], Match[]];
}

export type HashMatchingResultFunction = (matchingResult: MatchingResult) => { root: string, verify: (leaf: string) => boolean }