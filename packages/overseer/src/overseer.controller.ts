import { Controller, Get } from '@nestjs/common';

@Controller()
export class OverseerController {
  @Get()
  root() {}
}
