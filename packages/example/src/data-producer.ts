import type { Reading } from 'greenproof-worker';

const randomVolume = () => Math.floor(Math.random() * 300);
const minToMs = (min: number) => min * 60 * 1000;

export const produceData = () => {
  const consumptions = [] as Reading[];
  const generations = [] as Reading[];
  let timestamp = new Date('2022-04-01T00:00:00.000Z');

  for (let i = 0; i < 30; i += 1) {
    consumptions.push(
      { deviceId: 'c1', volume: randomVolume(), timestamp },
      { deviceId: 'c2', volume: randomVolume(), timestamp },
    );

    generations.push(
      { deviceId: 'g1', volume: randomVolume(), timestamp },
      { deviceId: 'g2', volume: randomVolume(), timestamp },
    );

    timestamp = new Date(timestamp.getTime() + minToMs(15));
  }

  return {
    consumptions,
    generations,
    preferences: {
      groupPriority: [
        [
          { id: 'c1', groupPriority: [[{ id: 'g1' }, { id: 'g2' }]]},
          { id: 'c2', groupPriority: [[{ id: 'g1' }, { id: 'g2' }]]},
        ],
      ],
    },
  };
};