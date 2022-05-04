import { Module } from '@nestjs/common';
import { TransactionInMemoryService } from './transaction-inmemory.service';
import { TransactionSlonikService } from './transaction-slonik.service';
import { TransactionService } from './types';

@Module({
  exports: [TransactionService],
  providers: [
    { provide: TransactionService, useClass: TransactionSlonikService },
  ],
})
/**
 * @NOTE
 * This module probably can be replaced by @leocode/nest-tx,
 * when it's latest version is released.
 */
export class TransactionModule {}

@Module({
  exports: [TransactionService],
  providers: [
    { provide: TransactionService, useClass: TransactionInMemoryService },
  ],
})
export class TransactionModuleForUnitTests {}
