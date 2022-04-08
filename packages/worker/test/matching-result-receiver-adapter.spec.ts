import { Test } from '@nestjs/testing';
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

    await facade.receiveMatchingResult(matchResult);

    expect(receiver1).toBeCalledWith(matchResult);
    expect(receiver2).toBeCalledWith(matchResult);
  });
});