import type { Reading } from '../data-storage/types';

export abstract class DataStorageService {
  abstract sendConsumptions(readings: Reading[]): Promise<void>;
  abstract sendGenerations(readings: Reading[]): Promise<void>;
}
