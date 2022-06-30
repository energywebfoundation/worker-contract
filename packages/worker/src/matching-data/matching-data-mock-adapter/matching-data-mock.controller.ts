import { Body, Controller, Post } from '@nestjs/common';
import { MatchingInput } from '../../types';
import { MatchingDataMockService } from './matching-data-mock.service';

@Controller('matching-data')
export class MatchingDataMockController {
  constructor(private readonly matchingDataService: MatchingDataMockService) {}

  @Post()
  public async storeInput(
    @Body() input: MatchingInput,
  ): Promise<void> {
    await this.matchingDataService.storeInput(input);
  }
}
