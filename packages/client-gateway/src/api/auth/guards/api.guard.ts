import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';


@Injectable()
export class ApiGuard implements CanActivate {
  public constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();

    if (request.headers['api-key'] === process.env.API_KEY) {
      return true;
    }

    throw new ForbiddenException();
  }
}

