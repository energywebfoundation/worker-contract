import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import type { Reading } from '../../data-storage/types';

export class ReadingDTO implements Reading {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({example: 'XYZ001'})
  deviceId!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty({example: 100})
  volume!: number;

  @IsDateString()
  @ApiProperty({ example: '2022-04-28T12:00:00.000Z'})
  timestamp!: Date;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'did:ethr:0xb9c5714089478a327f09197987f16f9e5d936e8a'})
  did!: string;
}
