import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, mergeMap } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const method = String(request.method || '').toUpperCase();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return next.handle();

    const correlationId = String(request.headers?.['x-correlation-id'] || randomUUID());
    response.setHeader('x-correlation-id', correlationId);
    return next.handle().pipe(mergeMap(async result => {
      const route = String(request.originalUrl || request.url || '').split('?')[0];
      const segments = route.split('/').filter(Boolean);
      const versionIndex = segments.findIndex((item: string) => /^v\d+$/.test(item));
      const resource = segments[versionIndex >= 0 ? versionIndex + 1 : 0] || 'system';
      const bodyFields = request.body && typeof request.body === 'object'
        ? Object.keys(request.body).filter(key => !/(password|token|secret|credential|authorization)/i.test(key))
        : [];
      const action = route.endsWith('/auth/login') ? 'LOGIN'
        : route.includes('/comments') ? 'COMMENT'
        : route.includes('/import') ? 'IMPORT'
        : route.includes('/status') ? 'STATUS_CHANGE'
        : route.endsWith('/test') ? 'TEST'
        : method === 'POST' ? 'CREATE'
        : method === 'DELETE' ? 'ARCHIVE'
        : 'UPDATE';
      const summary = result && typeof result === 'object' ? ['id', 'orderNumber', 'number', 'status', 'channel'].reduce((acc, key) => {
        if (result[key] !== undefined) acc[key] = result[key];
        return acc;
      }, {} as Record<string, unknown>) : undefined;
      try {
        await this.audit.write({
          actorId: request.user?.sub,
          action,
          resource,
          resourceId: String(result?.id || request.params?.id || request.params?.orderNumber || '') || undefined,
          route,
          correlationId,
          ipAddress: request.ip,
          userAgent: request.headers?.['user-agent'],
          payload: { fields: bodyFields, params: request.params || {} },
          result: summary && Object.keys(summary).length ? summary as any : undefined,
        });
      } catch {
        // Аудит не должен превращать успешную бизнес-операцию в ошибку ответа.
      }
      return result;
    }));
  }
}
