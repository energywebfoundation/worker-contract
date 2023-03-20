import { Injectable } from '@nestjs/common';
import type { InputDTO } from 'types';
import type { InputSource } from './types';

interface Entry {
  timestamp: Date;
  input: InputDTO;
}

@Injectable()
export class InputInMemorySource implements InputSource {
  public inputs: Entry[] = [];

  public addInput(input: InputDTO) {
    this.inputs.push({ input, timestamp: new Date() });
  }

  public async* getInputMessages(): AsyncGenerator<InputDTO[], any, unknown> {
    yield this.inputs
      .map(e => e.input);
    this.inputs = [];
  }
}
