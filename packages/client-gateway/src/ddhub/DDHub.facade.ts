import { Injectable, NotImplementedException } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ReadingDTO } from "src/readings/reading.dto";
import { DDHubService } from "./DDHub.service";

@Injectable()
export class DDHubFacade {
  private logger = new PinoLogger({renameContext: DDHubFacade.name});

  constructor(private ddHubService: DDHubService) {}

  async sendConsumptions(readings: ReadingDTO[]): Promise<void> {
    this.logger.info(`Sending ${readings.length} consumptions to DDHub.`);
    throw new NotImplementedException();
  }

  async sendGenerations(readings: ReadingDTO[]): Promise<void> {
    this.logger.info(`Sending ${readings.length} generations to DDHub.`);
    throw new NotImplementedException();
  }
}