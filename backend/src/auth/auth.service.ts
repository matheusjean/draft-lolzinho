import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RequestLoginCodeDto } from './dto/request-login-code.dto';
import { VerifyLoginCodeDto } from './dto/verify-login-code.dto';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async requestLoginCode(dto: RequestLoginCodeDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email not authorized.');
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.getLoginCodeTtlMinutes() * 60 * 1000,
    );
    const code = this.generateCode();
    const codeHash = this.hashValue(code);

    await this.prisma.$transaction([
      this.prisma.loginCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          consumedAt: now,
        },
      }),
      this.prisma.loginCode.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt,
        },
      }),
    ]);

    this.logger.log(`Login code for ${email}: ${code}`);

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    return {
      message: isProduction
        ? 'Login code generated. Check the server logs for now.'
        : 'Login code generated for local use.',
      expiresAt,
      ...(isProduction ? {} : { code }),
    };
  }

  async verifyLoginCode(dto: VerifyLoginCodeDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const now = new Date();
    const loginCode = await this.prisma.loginCode.findFirst({
      where: {
        userId: user.id,
        codeHash: this.hashValue(dto.code),
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!loginCode) {
      throw new UnauthorizedException('Invalid or expired code.');
    }

    await this.prisma.$transaction([
      this.prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { consumedAt: now },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      }),
    ]);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        lastLoginAt: now,
      },
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private generateCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private getLoginCodeTtlMinutes() {
    return Number(this.configService.get<string>('LOGIN_CODE_TTL_MINUTES') ?? '15');
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
