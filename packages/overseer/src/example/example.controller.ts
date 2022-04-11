import { Controller, Get } from "@nestjs/common";
import { OverseerService } from "../overseer.service";

@Controller('greeter')
export class OverseerController {
  constructor(private overseerService: OverseerService) {}

  @Get('/greet')
  async greet() {
    // await this.overseerService.greet();
  }
}