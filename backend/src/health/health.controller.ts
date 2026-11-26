import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';

export class HealthQueryDto {
  @IsOptional()
  @IsString()
  check?: string;
}

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(
    @Query(
      new ValidationPipe({
        expectedType: HealthQueryDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    _query: HealthQueryDto,
  ): { status: 'ok' } {
    return { status: 'ok' };
  }
}
