import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

// The length limit keeps very long inputs away from the slow password hash.
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  newPassword!: string;
}
