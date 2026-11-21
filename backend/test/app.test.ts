import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Test } from '@nestjs/testing';
import { ErrorResponseFilter } from '../src/common/error-response.filter';

class ValidationProbeDto {
  @IsString()
  name?: string;
}

@Controller('validation-probe')
class ValidationProbeController {
  @Post()
  create(@Body() _body: ValidationProbeDto): { status: 'ok' } {
    return { status: 'ok' };
  }
}

describe('backend foundation', () => {
  let app: INestApplication;
  let createApp: typeof import('../src/main').createApp;

  before(async () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';
    ({ createApp } = await import('../src/main'));
    app = await createApp();
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('returns health status at the versioned public endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok' });
  });

  it('rejects unknown query fields with the standard error shape', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/health?unexpected=value',
    );

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
    });
  });

  it('does not expose stack traces for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/does-not-exist',
    );

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      code: 'NOT_FOUND',
      message: 'The request could not be completed.',
    });
  });

  it('does not allow an unknown origin through CORS', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://unexpected.example');

    assert.equal(response.status, 200);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  });

  it('rejects mutations from an unknown origin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .set('Origin', 'https://unexpected.example')
      .send({ name: 'Test' });

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      code: 'FORBIDDEN',
      message: 'The request could not be completed.',
    });
  });

  it('rejects request bodies larger than 1 MB', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ payload: 'x'.repeat(1024 * 1024 + 1) }));

    assert.equal(response.status, 413);
  });

  it('rejects unknown fields in a JSON body', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ValidationProbeController],
    }).compile();
    const probeApp = moduleRef.createNestApplication();
    probeApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    probeApp.useGlobalFilters(new ErrorResponseFilter());
    await probeApp.init();

    try {
      const response = await request(probeApp.getHttpServer())
        .post('/validation-probe')
        .send({ name: 'Test', unexpected: true });

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
      });
    } finally {
      await probeApp.close();
    }
  });

  it('serves Swagger documentation', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');

    assert.equal(response.status, 200);
    assert.equal(response.body.info.title, 'AtomPlus Learn API');
  });
});
