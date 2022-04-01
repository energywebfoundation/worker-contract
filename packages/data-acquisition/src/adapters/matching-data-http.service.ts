// import { Injectable } from '@nestjs/common';
// import { MatchingDataService } from "./data-acquisition.service";
// import { Reading, ReadingQuery } from './types';
// import axios from 'axios';

// // TODO: move this
// interface Configuration {
//   READING_DATA_URL: string;
//   READING_DATA_API_KEY: string;
// }

// @Injectable()
// export class DataAcquisitionHttpService implements MatchingDataService {
//   // TODO
//   private configuration: Configuration = {
//     READING_DATA_URL: 'localhost:8080',
//     READING_DATA_API_KEY: 'apikey'
//   };

//   constrcutor( ) { }

//   public async getConsumptionData(query: ReadingQuery): Promise<Reading[]> {
//       return await axios.request({
//         method: 'get',
//         url: this.configuration.READING_DATA_URL,
//         headers: {
//           'api-key': this.configuration.READING_DATA_API_KEY
//         },
//         params: query
//       })
//   }
// }
