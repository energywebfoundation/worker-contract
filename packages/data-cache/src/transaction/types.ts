import type { DatabaseTransactionConnection } from 'slonik';

export abstract class TransactionService {
  /** @NOTE For now until @leocode/nest-tx is used we pass slonik transaction here, for convenience reasons */
  abstract withTransaction<T>(cb: (tx: DatabaseTransactionConnection) => Promise<T>): Promise<T>;
}