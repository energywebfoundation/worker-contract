import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";

@Controller('healthcheck')
export class HealtcheckController {
  @Get()
  @ApiOkResponse({ description: "Returns status code 200", status: 200 })
  async healthcheck(): Promise<void> {}
}
