import { Module } from '@nestjs/common';
import { OverseerController } from './overseer.controller';
import { OverseerService } from './overseer.service';
import { BlockchainConfig, EventListeners, OverseerConfig } from './types';


const mockConfig: BlockchainConfig = {
  rpcHost: 'http://localhost:8545',
  contractAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  overseerPrivateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
};

const mockDDHubService = {
  getLastHandledBlockNumber: () => { return 0; },
};

const mockListeners = new Map<string, Function>();
mockListeners.set('Greeting', (ev: any) => { console.log(ev); });

// const mockListeners: EventListeners = {
//   'Greeting' : [(ev: any) => { console.log(ev); }]
// };
@Module({
  imports: [],
  controllers: [
    OverseerController,
  ],
  providers: [
    {
      provide: OverseerService,
      useValue: new OverseerService(mockConfig, mockDDHubService, mockListeners)},
  ],
})
export class OverseerModule {
  public static register(params: OverseerConfig) {

  }
}
