import { Body, Controller, Post } from '@nestjs/common';
import { FeedFacade } from '../feed/feed.facade';
import { FeedMatchResultRequest } from './dto';

@Controller('/feed')
export class FeedController {
  constructor(
    private feedFacade: FeedFacade,
  ) {}

  @Post('/match-result')
  public async feedMatchResult(
    @Body() result: FeedMatchResultRequest,
  ): Promise<void> {
    await this.feedFacade.feedMatches(result.rootHash);
  }
}
