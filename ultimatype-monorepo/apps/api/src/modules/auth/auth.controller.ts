import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

/** Shape Passport attaches to req.user after OAuth strategies succeed */
interface OAuthPassportUser {
  provider: 'GOOGLE' | 'GITHUB';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Shape Passport attaches to req.user after JWT strategy succeeds */
interface JwtPassportUser {
  userId: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  // ---- Google OAuth ----

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request & { user: OAuthPassportUser; ip: string }, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  // ---- GitHub OAuth ----

  @Get('github')
  @UseGuards(GithubAuthGuard)
  githubLogin() {
    // Guard redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: Request & { user: OAuthPassportUser; ip: string }, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  // ---- Token Refresh ----

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request & { user: JwtPassportUser }) {
    const userId = req.user.userId;
    const tokens = await this.authService.refreshTokens(userId);
    return tokens;
  }

  // ---- Current User Profile ----

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request & { user: JwtPassportUser }) {
    const userId = req.user.userId;
    return this.usersService.findById(userId);
  }

  // ---- Private Helpers ----

  /**
   * Generates a short-lived auth code (JWT 60s) and redirects the browser
   * to the frontend callback URL. The frontend must immediately exchange the
   * code for real tokens via POST /auth/code.
   * This avoids exposing long-lived tokens in the URL / browser history.
   */
  private async handleOAuthCallback(
    req: Request & { user: OAuthPassportUser; ip: string },
    res: Response,
  ) {
    const clientIp: string | undefined = req.ip;

    const user = await this.authService.validateOAuthUser(req.user, clientIp);
    const code = await this.authService.generateAuthCode(user);
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}`);
  }

  /**
   * Exchanges a short-lived auth code for real access + refresh tokens.
   * The code is a JWT (60s TTL) issued by handleOAuthCallback.
   */
  @Post('code')
  async exchangeCode(@Body('code') code: string) {
    return this.authService.exchangeAuthCode(code);
  }
}
