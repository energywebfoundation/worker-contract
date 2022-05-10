import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config'
import { ClientGatewayModule } from './client-gateway.module';

export type ClientGatewayConfiguration = {
  port: number,
  apiKey: string;
  DDHubURL: string;
}

export async function bootstrap(configuration?: ClientGatewayConfiguration) {
  
  const app = await NestFactory.create(ClientGatewayModule.register(configuration));
  app.useLogger(app.get(Logger));
  
  const config = new DocumentBuilder()
  .setTitle('ClientGateway')
  .setDescription('The Greenproof client-gateway API description')
  .setVersion('1.0')
  .addTag('client-gateway')
  .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
  
  const configService = await app.resolve(ConfigService);
  
  const clientGatewayPort = configService.get<string>('CLIENT_GATEWAY_PORT')
  
  await app.listen(Number(clientGatewayPort));
  console.log(`Client Gateway starting on port ${clientGatewayPort}`);
}

bootstrap();
