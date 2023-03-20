import type { MatchTest } from './bootstrap';
import type { MatchingData } from './bootstrap';

const plainInput: MatchingData = {
  batteries: [],
  consumptions: [],
  generations: [],
};

class BatteryBuilder {

  constructor(
    private readonly applier: (battery: MatchingData['batteries'][number]) => InputBuilder,
    private readonly id: string,
    private readonly volume: number,
    private readonly soC: number,
  ) {}

  withId(id: string): BatteryBuilder {
    return new BatteryBuilder(this.applier, id, this.volume, this.soC);
  }

  withVolume(volume: number): BatteryBuilder {
    return new BatteryBuilder(this.applier, this.id, volume, this.soC);
  }

  withSoC(soC: number): BatteryBuilder {
    return new BatteryBuilder(this.applier, this.id, this.volume, soC);
  }

  add(): InputBuilder {
    return this.applier([this.id, this.volume, this.soC]);
  }
}

class GenerationBuilder {

  constructor(
    private readonly applier: (generation: MatchingData['generations'][number]) => InputBuilder,
    private readonly id: string,
    private readonly volume: number,
  ) {}

  withId(id: string): GenerationBuilder {
    return new GenerationBuilder(this.applier, id, this.volume);
  }

  withVolume(volume: number): GenerationBuilder {
    return new GenerationBuilder(this.applier, this.id, volume);
  }

  add(): InputBuilder {
    return this.applier([this.id, this.volume]);
  }
}


class ConsumptionBuilder {

  constructor(
    private readonly applier: (consumption: MatchingData['consumptions'][number]) => InputBuilder,
    private readonly id: string,
    private readonly volume: number,
  ) {}

  withId(id: string): ConsumptionBuilder {
    return new ConsumptionBuilder(this.applier, id, this.volume);
  }

  withVolume(volume: number): ConsumptionBuilder {
    return new ConsumptionBuilder(this.applier, this.id, volume);
  }

  add(): InputBuilder {
    return this.applier([this.id, this.volume]);
  }
}

export class InputBuilder {

  private constructor(private readonly test: MatchTest, private data: MatchingData = plainInput) {}

  withBattery(): BatteryBuilder {
    return new BatteryBuilder(
      (battery) => {
        return new InputBuilder(this.test, {
          ...this.data,
          batteries: [...this.data.batteries, battery],
        });
      },
      '',
      0,
      0,
    );
  }

  withGeneration(): GenerationBuilder {
    return new GenerationBuilder(
      (generation) => {
        return new InputBuilder(this.test, {
          ...this.data,
          generations: [...this.data.generations, generation],
        });
      },
      '',
      0,
    );
  }

  withConsumption(): ConsumptionBuilder {
    return new ConsumptionBuilder(
      (consumption) => {
        return new InputBuilder(this.test, {
          ...this.data,
          consumptions: [...this.data.consumptions, consumption],
        });
      },
      '',
      0,
    );
  }

  async apply(): Promise<void> {
    await this.test.addInput(this.data);
    this.data = plainInput;
  }

  public static create(test: MatchTest): InputBuilder {
    return new InputBuilder(test);
  }
}
