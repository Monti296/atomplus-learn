import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  code: string;
  message: string;
}

@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      exception.status === 413
    ) {
      response.status(413).json({
        code: 'REQUEST_TOO_LARGE',
        message: 'Request body is too large.',
      } satisfies ErrorResponseBody);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = this.getHttpErrorBody(exception);
      response.status(status).json(body);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    } satisfies ErrorResponseBody);
  }

  private getHttpErrorBody(exception: HttpException): ErrorResponseBody {
    const response = exception.getResponse();
    if (
      typeof response === 'object' &&
      response !== null &&
      'code' in response &&
      'message' in response &&
      typeof response.code === 'string' &&
      typeof response.message === 'string'
    ) {
      return { code: response.code, message: response.message };
    }

    if (exception.getStatus() === HttpStatus.BAD_REQUEST) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
      };
    }

    return {
      code: this.getErrorCode(exception.getStatus()),
      message: 'The request could not be completed.',
    };
  }

  private getErrorCode(status: number): string {
    if (status === HttpStatus.NOT_FOUND) {
      return 'NOT_FOUND';
    }

    if (status === HttpStatus.FORBIDDEN) {
      return 'FORBIDDEN';
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return 'UNAUTHORIZED';
    }

    return 'REQUEST_ERROR';
  }
}
