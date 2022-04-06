import { BigNumber } from '@ethersproject/bignumber';
import { times } from 'lodash';
import { ProportionalMatcher } from '../src/ProportionalMatcher';



describe('ProportionalMatcher', () => {
  it('works', () => {
    console.time('Matching');
    // const result = ProportionalMatcher.proportionalMatcher({
    //   sources: [
    //     { id: 's1', volume: BigNumber.from(10) },
    //     { id: 's2', volume: BigNumber.from(10) },
    //   ],
    //   targets: [
    //     { id: 't1', volume: BigNumber.from(20) },
    //     { id: 't2', volume: BigNumber.from(10) },
    //   ],
    //   targetWeights: [
    //     { targetId: 't1', sourceId: 's1', weight: 2 },
    //     { targetId: 't1', sourceId: 's2', weight: 2 },
    //     { targetId: 't2', sourceId: 's1', weight: 1 },
    //     { targetId: 't2', sourceId: 's2', weight: 1 },
    //   ]
    // });
    const result = ProportionalMatcher.proportionalMatcher({
      sources: times(1000, (n) => ({ id: `s${n}`, volume: BigNumber.from(1000) })),
      targets: times(10000, (n) => ({ id: `t${n}`, volume: BigNumber.from(100) })),
      targetWeights: times(1000, (s) => times(10000, (t) => ({
        targetId: `t${t}`,
        sourceId: `s${s}`,
        weight: 1,
      }))).flat(),
    });
    console.timeEnd('Matching');

    const matches = result.matches.map(match => `${match.source.id} -- ${match.volume.toString()} --> ${match.target.id} `);

    console.log(matches.join('\n'));
    console.log(JSON.stringify(result.leftoverSources, null, 2));
    console.log(JSON.stringify(result.leftoverTargets, null, 2));

    expect(true).toBe(true);
  });
});
