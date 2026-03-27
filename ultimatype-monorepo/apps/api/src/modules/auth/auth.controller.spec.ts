import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller';

const mockAuthService = {
  validateOAuthUser: vi.fn(),
  generateAuthCode: vi.fn().mockResolvedValue('mock-code'),
};

const mockUsersService = {
  findById: vi.fn(),
};

const mockConfigService = {
  getOrThrow: vi.fn().mockReturnValue('http://localhost:4200'),
};

function makeReq(ip: string | undefined, user = { provider: 'GOOGLE', providerId: '1' }) {
  return { ip, user };
}

function makeRes() {
  return { redirect: vi.fn() };
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(
      mockAuthService as any,
      mockUsersService as any,
      mockConfigService as any,
    );
    mockAuthService.validateOAuthUser.mockResolvedValue({ id: 'u1', email: 'a@b.com', displayName: 'A' });
  });

  describe('handleOAuthCallback — IP extraction', () => {
    it('pasa req.ip a validateOAuthUser cuando está disponible', async () => {
      const req = makeReq('200.1.2.3');
      const res = makeRes();

      await (controller as any).handleOAuthCallback(req, res);

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith(
        req.user,
        '200.1.2.3',
      );
    });

    it('pasa undefined a validateOAuthUser cuando req.ip no está disponible', async () => {
      const req = makeReq(undefined);
      const res = makeRes();

      await (controller as any).handleOAuthCallback(req, res);

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith(
        req.user,
        undefined,
      );
    });

    it('redirige al frontend callback con el auth code', async () => {
      const req = makeReq('1.2.3.4');
      const res = makeRes();

      await (controller as any).handleOAuthCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback?code='),
      );
    });
  });
});
