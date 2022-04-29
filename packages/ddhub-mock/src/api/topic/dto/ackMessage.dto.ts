import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AckMessageDTO {
  @IsString()
  @ApiProperty()
  topicName: string;

  @IsString()
  @ApiProperty()
  clientId: string;

  @IsString()
  @ApiProperty()
  messageId: string;
}
