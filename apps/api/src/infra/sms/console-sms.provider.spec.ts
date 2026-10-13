import { ConsoleSmsProvider } from './console-sms.provider';

import type { AppConfig } from '../../config/app-config.service';

describe('ConsoleSmsProvider', () => {
  let stdout: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  const output = (): string => stdout.mock.calls.map(([chunk]) => String(chunk)).join('');

  it('prints the message to the terminal when APP_ENV=local', async () => {
    const provider = new ConsoleSmsProvider({ appEnv: 'local' } as AppConfig);
    await provider.send('+923001234567', 'Your Boxxed code is 123456');
    expect(output()).toContain('123456');
  });

  it.each(['staging', 'production'] as const)(
    'never outputs the code or destination when APP_ENV=%s',
    async (appEnv) => {
      const provider = new ConsoleSmsProvider({ appEnv } as AppConfig);
      await provider.send('+923001234567', 'Your Boxxed code is 123456');
      expect(output()).not.toContain('123456');
      expect(output()).not.toContain('+923001234567');
    },
  );
});
