import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class CreateTopicDTO {
  @IsString()
  @ApiProperty()
  topicName: string;

  @IsArray()
  @ApiProperty()
  clientIds: string[];
}
