import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

import { version } from '@/../package.json';

@Controller({
  path: '/health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    private _health: HealthCheckService,
    private _memory: MemoryHealthIndicator,
  ) {}

  @Get('/')
  @HealthCheck()
  check() {
    return this._health.check([
      async (): Promise<HealthIndicatorResult> => ({
        version: { status: 'up', value: version },
      }),
      async () => this._memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      async () => this._memory.checkRSS('memory_rss', 3000 * 1024 * 1024),
    ]);
  }
}
