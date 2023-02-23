import { plainToClass, Type } from 'class-transformer';
import {
  ValidateNested,
  IsEnum,
  validateSync,
  IsString,
  IsEthereumAddress,
  IsNumber,
} from 'class-validator';
import { join } from 'path';
import { config } from 'dotenv';
import type { ValidationError } from '@nestjs/common';

export enum Env {
  DEV = 'dev',
  TEST = 'test',
  E2E = 'e2e',
  PRODUCTION = 'production',
}

class MessagingConfig {
  @IsString()
  url!: string;

  @IsString()
  matchingResultTopicName!: string;

  @IsString()
  inputTopicName!: string;
}

class DbConfig {
  @IsString()
  location!: string;
}

class WorkerConfig {
  @IsString()
  privateKey!: string;

  @IsString()
  rpcUrl!: string;

  @IsString()
  @IsEthereumAddress()
  diamondContractAddress!: string;

  @IsNumber()
  port!: number;

  @IsString()
  @IsEthereumAddress()
  workerBlockchainAddress!: string;
}

class BackendConfig {
  @IsString()
  url!: string;

  @IsString()
  matchingResultEndpoint!: string;

  @IsString()
  apiKey!: string;
}

class Config {
  @IsEnum(Env)
  nodeEnv!: Env;

  @ValidateNested()
  @Type(() => MessagingConfig)
  messagingConfig!: MessagingConfig;

  @ValidateNested()
  @Type(() => DbConfig)
  dbConfig!: DbConfig;

  @ValidateNested()
  @Type(() => WorkerConfig)
  workerConfig!: WorkerConfig;

  @ValidateNested()
  @Type(() => BackendConfig)
  backend!: BackendConfig;
}

const prepareConfig = (): Readonly<Config> => {
  const config: Config = {
    dbConfig: {
      location: join(process.env['SQLITE_LOCATION'] ?? join('/tmp', 'worker.sqlite')),
    },
    nodeEnv: (process.env.NODE_ENV! as Env) ?? Env.DEV,
    messagingConfig: {
      url: process.env.DDHUB_URL!,
      matchingResultTopicName: process.env.MATCHING_RESULT_TOPIC_NAME! ?? 'result',
      inputTopicName: process.env.INPUT_TOPIC_NAME! ?? 'input',
    },
    workerConfig: {
      port: parseInt(process.env['PORT']!, 10),
      rpcUrl: process.env['RPC_HOST']!,
      diamondContractAddress: process.env['DIAMOND_CONTRACT_ADDRESS']!,
      privateKey: process.env['WORKER_PRIVATE_KEY']!,
      workerBlockchainAddress: process.env['WORKER_BLOCKCHAIN_ADDRESS']!,
    },
    backend: {
      url: process.env.BACKEND_URL ?? 'http://backend:3030',
      matchingResultEndpoint: process.env.BACKEND_URL_MATCHING_RESULT_ENDPOINT ?? 'api/maintenance/matching-result',
      apiKey: process.env.BACKEND_API_KEY ?? 'monads_are_for_nerds',
    },
  };
  const plaintConfig = plainToClass(Config, config);

  const errors = validateSync(plaintConfig);
  if (errors.length) {
    throw new Error(
      `Invalid configuration: \n${JSON.stringify(findValidationErrors(errors), null, 2)}`,
    );
  }

  return plaintConfig;
};

config({ path: join(__dirname, '../../..', '.env') });

const recursivelyFindProperties = <InspectedObject extends Record<string, any>>(
  object: InspectedObject,
  keyToFind: keyof InspectedObject,
) => {
  const values: Record<string, any>[] = [];
  Object.keys(object).forEach((key) => {
    if (key === keyToFind) {
      values.push(object[key]);
    }
    if (object[key] && typeof object[key] === 'object') {
      values.push(...recursivelyFindProperties(object[key], keyToFind));
    }
  });
  return values;
};

const findValidationErrors = (errors: ValidationError[]) =>
  errors.flatMap((error) => recursivelyFindProperties(error, 'constraints'));

export const appConfig: Readonly<Config> = prepareConfig();
