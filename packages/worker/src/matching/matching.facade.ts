import type { Preferences, Reading } from '../matching-data/types';
import type { MatchingDataFacade } from '../matching-data/matching-data.facade';

interface MatchingInput {
  consumptions: Reading[];
  generations: Reading[];
  preferences: Preferences;
}

interface MatchingOutput {

}

export class MatchingFacade {
  constructor(
    private matchingDataFacade: MatchingDataFacade,
    private matchingResultFacade: MatchingResultFacade,
    private matchingAlgorithm: (input: MatchingInput) => MatchingOutput,
  ) {}

  public async match(timestamp: Date) {
    const consumptions = await this.matchingDataFacade.getConsumptions({from: timestamp, to: timestamp});
    const generations = await this.matchingDataFacade.getGenerations({from: timestamp, to: timestamp});
    const preferences = await this.matchingDataFacade.getPreferences();

    const matchingResult = this.matchingAlgorithm({consumptions, generations, preferences});
  }
}
