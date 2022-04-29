import { Inject } from '@nestjs/common';
import type { SlonikModuleOptions } from '../interfaces';
import { getPoolToken } from './slonik.utils';

export const InjectPool = (
  options?: SlonikModuleOptions | string,
): ParameterDecorator => Inject(getPoolToken(options));
