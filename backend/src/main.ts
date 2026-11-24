import 'reflect-metadata';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { json, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { ErrorResponseFilter } from './common/error-response.filter';
import { ValidatedEnvironment } from './config/environment';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  return app;
}

// Shared by the real app and the tests, so both get the same security setup.
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<ValidatedEnvironment, true>);
  const frontendOrigin = config.get('FRONTEND_ORIGIN', { infer: true });

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app
    .getHttpAdapter()
    .getInstance()
    .use(json({ limit: '1mb' }));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => {
      callback(null, origin === undefined || origin === frontendOrigin);
    },
    credentials: true,
  });
  app.use((request: Request, _response: Response, next: NextFunction) => {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      request.method,
    );
    if (isMutation) {
      const origin = request.headers.origin;
      if (typeof origin !== 'string' || origin !== frontendOrigin) {
        throw new ForbiddenException();
      }
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ErrorResponseFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AtomPlus Learn API')
    .setDescription('The AtomPlus Learn backend API.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService<ValidatedEnvironment, true>);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`Backend: http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/api/v1/health`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

if (require.main === module) {
  void bootstrap();
}
