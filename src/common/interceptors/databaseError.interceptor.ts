import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import { QueryFailedError } from 'typeorm';

export class DataBaseError extends Error {}

@Injectable()
export class DataBaseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        if (
          error instanceof QueryFailedError ||
          error instanceof DataBaseError
        ) {
          throw new ConflictException(error.message);
        }
        throw error;
      }),
    );
  }
}
