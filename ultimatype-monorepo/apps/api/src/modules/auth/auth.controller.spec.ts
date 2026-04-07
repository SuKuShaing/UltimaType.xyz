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

function makeReq(headers: Record<string, string> = {}, user = { provider: 'GOOGLE', providerId: '1' }) {
  return { headers, user };
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

  describe('handleOAuthCallback — CF-IPCountry extraction', () => {
    it('pasa CF-IPCountry a validateOAuthUser cuando el header está presente', async () => {
      const req = makeReq({ 'cf-ipcountry': 'CL' });
      const res = makeRes();

      await (controller as any).handleOAuthCallback(req, res);

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith(
        req.user,
        'CL',
      );
    });

    it('pasa undefined a validateOAuthUser cuando CF-IPCountry no está presente', async () => {
      const req = makeReq({});
      const res = makeRes();

      await (controller as any).handleOAuthCallback(req, res);

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith(
        req.user,
        undefined,
      );
    });

    it('redirige al frontend callback con el auth code', async () => {
      const req = makeReq({ 'cf-ipcountry': 'AR' });
      const res = makeRes();

      await (controller as any).handleOAuthCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback?code='),
      );
    });
  });
});
