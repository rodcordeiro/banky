import { INestApplication } from '@nestjs/common';
import { AppUtils } from './app.util';

describe('AppUtils', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(['SIGINT', 'SIGTERM'] as const)(
    'registers graceful shutdown handler for %s',
    signal => {
      const app = { close: jest.fn().mockResolvedValue(undefined) };
      const onSpy = jest.spyOn(process, 'on').mockImplementation();

      AppUtils.killAppWithGrace(app as unknown as INestApplication);

      expect(onSpy).toHaveBeenCalledWith(signal, expect.any(Function));
    },
  );

  it.each(['SIGINT', 'SIGTERM'] as const)(
    'closes app and exits with success on %s',
    async signal => {
      jest.useFakeTimers();
      const app = { close: jest.fn().mockResolvedValue(undefined) };
      const handlers = new Map<string, NodeJS.SignalsListener>();
      jest.spyOn(process, 'on').mockImplementation((event, listener) => {
        handlers.set(String(event), listener as NodeJS.SignalsListener);
        return process;
      });
      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as never);

      AppUtils.killAppWithGrace(app as unknown as INestApplication);
      await handlers.get(signal)?.(signal);

      expect(app.close).toHaveBeenCalledWith();
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(jest.getTimerCount()).toBe(1);
    },
  );

  it('forces error exit if graceful shutdown timeout elapses', () => {
    jest.useFakeTimers();
    const app = { close: jest.fn().mockResolvedValue(undefined) };
    const handlers = new Map<string, NodeJS.SignalsListener>();
    jest.spyOn(process, 'on').mockImplementation((event, listener) => {
      handlers.set(String(event), listener as NodeJS.SignalsListener);
      return process;
    });
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);

    AppUtils.killAppWithGrace(app as unknown as INestApplication);
    handlers.get('SIGINT')?.('SIGINT');
    jest.runOnlyPendingTimers();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
