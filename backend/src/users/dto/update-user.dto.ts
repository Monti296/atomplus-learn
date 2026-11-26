import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Only the two allowed states are accepted; the email cannot be changed here.
export enum EditableUserStatus {
  active = 'active',
  blocked = 'blocked',
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ravi K.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: EditableUserStatus })
  @IsOptional()
  @IsEnum(EditableUserStatus)
  status?: EditableUserStatus;
}
