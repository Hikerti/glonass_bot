import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GeneratePostTextDTO {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  prompt: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  channel?: string;
}

export class GeneratePostTextResponseDTO {
  text: string;
}
