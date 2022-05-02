import { Body, Controller, Post } from '@nestjs/common';
import { FeedFacade } from '../feed/feed.facade';
import { FeedMatchResultRequest } from './dto';

@Controller('/feed')
export class FeedController {
  constructor(
    private feedFacade: FeedFacade,
  ) {}

  /** @TODO how overseer will know this endpoint address? */
  @Post('/match-result')
  public async feedMatchResult(
    @Body() result: FeedMatchResultRequest,
  ): Promise<void> {
    /** @TODO make it non-blocking */
    await this.feedFacade.feedMatches(result.rootHash)
  }
}
