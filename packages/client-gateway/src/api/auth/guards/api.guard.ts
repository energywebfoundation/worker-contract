import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class ApiGuard implements CanActivate {
  public constructor(private configService: ConfigService) { }

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();

    if (request.headers['api-key'] === this.configService.get('API_KEY')) {
      return true;
    }

    throw new ForbiddenException();
  }
}

