import { Controller, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/:timestamp')
  async match(
    @Param('timestamp') timestamp: string,
  ) {
    await this.appService.match(new Date(timestamp));
  }
}
