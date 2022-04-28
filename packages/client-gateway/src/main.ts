import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { ClientGatewayModule } from './client-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(ClientGatewayModule);
  app.useLogger(app.get(Logger));

  
  const config = new DocumentBuilder()
    .setTitle('ClientGateway')
    .setDescription('The Greenproof client-gateway API description')
    .setVersion('1.0')
    .addTag('client-gateway')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
  
  await app.listen(3000);
}
bootstrap();
