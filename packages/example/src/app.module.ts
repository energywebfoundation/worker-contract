import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingModule, MatchingDataInMemoryAdapterModule, MatchingResultModule, matchingResultLogger } from 'greenproof-worker';
import { SpreadMatcher } from 'greenproof-algorithms';
import { BigNumber } from '@ethersproject/bignumber';

@Module({
  imports: [
    MatchingModule.register({
      dependendencies: [
        MatchingDataInMemoryAdapterModule.register({
          consumptions: [
            { deviceId: 'c1', timestamp: new Date('2022-04-07T09:00:00.000Z'), volume: 200 },
          ],
          generations: [
            { deviceId: 'g1', timestamp: new Date('2022-04-07T09:00:00.000Z'), volume: 100 },
          ],
          preferences: {
            groupPriority: [
              [{ id: 'c1', groupPriority: [[{ id: 'g1' }]]}]
            ],
          }
        }),
        MatchingResultModule.register({
          receivers: [
            matchingResultLogger,
          ]
        })
      ],
      matchingAlgorithm: (input) => {
        const result = SpreadMatcher.spreadMatcher({
          entityGroups: [
            input.consumptions.map(c => ({ id: c.deviceId, volume: BigNumber.from(c.volume) })),
            input.generations.map(g => ({ id: g.deviceId, volume: BigNumber.from(g.volume) })),
          ],
          groupPriority: input.preferences.groupPriority,
        });

        return {
          matches: result.matches.map(match => ({
            consumerId: match.entities[0].id,
            generatorId: match.entities[1].id,
            volume: match.volume.toNumber(),
          })),
          leftoverConsumptions: result.leftoverEntities[0].map(e => ({
            id: e.id,
            volume: e.volume.toNumber(),
          })),
          excessGenerations: result.leftoverEntities[1].map(e => ({
            id: e.id,
            volume: e.volume.toNumber(),
          })),
        }
      },
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
