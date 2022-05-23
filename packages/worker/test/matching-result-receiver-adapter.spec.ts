import { Test } from '@nestjs/testing';
import type { MatchingInput} from '../src';
import { MatchingResultReceiversAdapterModule } from '../src';
import { MatchingResultFacade } from '../src/matching-result/matching-result.facade';
import type { MatchingResult } from '../src/matching-result/types';

describe('Matching result', () => {
  it('moves results to all receivers', async () => {
    const receiver1 = jest.fn();
    const receiver2 = jest.fn();

    const mod = await Test.createTestingModule({
      imports: [MatchingResultReceiversAdapterModule.register({
        receivers: [
          receiver1,
          receiver2,
        ],
      })],
    }).compile();

    const facade = mod.get(MatchingResultFacade) as MatchingResultFacade;

    const matchResult: MatchingResult = {
      timestamp: new Date(),
      data: {
        matches: [],
        excessGenerations: [],
        leftoverConsumptions: [],
      },
      tree: {
        leaves: [],
        rootHash: '0x0',
      },
    };

    const matchInput: MatchingInput = {
      consumptions: [],
      generations: [],
      preferences: { groupPriority: [] },
    };

    await facade.receiveMatchingResult(matchResult, matchInput);

    expect(receiver1).toBeCalledWith(matchResult, matchInput);
    expect(receiver2).toBeCalledWith(matchResult, matchInput);
  });
});