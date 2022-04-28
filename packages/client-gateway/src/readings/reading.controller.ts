import { Body, Controller, ParseArrayPipe, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse } from "@nestjs/swagger";
import { PinoLogger } from "nestjs-pino";
import { DDHubFacade } from "../ddhub/DDHub.facade";
import { ReadingDTO } from "./reading.dto";

@Controller('readings')
export class ReadingsController {
  private logger = new PinoLogger({renameContext: ReadingsController.name});

  constructor(private readonly ddHub: DDHubFacade) {}

  @Post('/consumptions')
  @ApiBody({type: ReadingDTO})
  @ApiOkResponse({status: 200, description: 'Sends consumptions to DDHub'})
  async sendConsumptions(
    @Body(new ParseArrayPipe({items: ReadingDTO})) readings: ReadingDTO[]
  ): Promise<void> {
    this.logger.info(`Received ${readings.length} consumptions to send to DDHub.`);

    await this.ddHub.sendConsumptions(readings);

    this.logger.info(`${readings.length} consumptions succesfuly sent to DDHub.`);
  }

  @Post('/generations')
  @ApiBody({type: ReadingDTO})
  @ApiOkResponse({status: 200, description: 'Sends generations to DDHub'})
  async sendGenerations(
    @Body(new ParseArrayPipe({items: ReadingDTO})) readings: ReadingDTO[]
  ): Promise<void> {
    this.logger.info(`Received ${readings.length} generations to send to DDHub.`)

    await this.ddHub.sendGenerations(readings);

    this.logger.info(`${readings.length} generations succesfuly sent to DDHub.`);
  }
}