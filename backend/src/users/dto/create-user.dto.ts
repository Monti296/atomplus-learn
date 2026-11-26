import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Only these two roles can be given at creation; the password is always system-generated (SR-2).
export enum CreatableUserRole {
  employee = 'employee',
  admin = 'admin',
}

export class CreateUserDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'ravi@atomplus.in' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({
    enum: CreatableUserRole,
    default: CreatableUserRole.employee,
  })
  @IsOptional()
  @IsEnum(CreatableUserRole)
  role?: CreatableUserRole;
}
