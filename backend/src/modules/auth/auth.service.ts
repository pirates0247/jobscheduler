import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get accessSecret() {
    return this.configService.get<string>('app.jwt.accessSecret') ?? 'secret';
  }

  private get refreshSecret() {
    return (
      this.configService.get<string>('app.jwt.refreshSecret') ??
      'refresh-secret'
    );
  }

  private get accessExpiresIn() {
    return this.configService.get<string>('app.jwt.accessExpiresIn') ?? '15m';
  }

  private get refreshExpiresIn() {
    return this.configService.get<string>('app.jwt.refreshExpiresIn') ?? '7d';
  }

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      userAgent,
      ip,
    );
    return { user, ...tokens };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      userAgent,
      ip,
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  async refresh(rawToken: string, userAgent?: string, ip?: string) {
    // Verify token signature first
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(rawToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Find matching token (single-use rotation)
    const tokenHash = await bcrypt.hash(rawToken, 10);

    // We need to find by userId and verify against stored hashes
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let validToken: (typeof storedTokens)[0] | undefined;
    for (const t of storedTokens) {
      if (await bcrypt.compare(rawToken, t.tokenHash)) {
        validToken = t;
        break;
      }
    }

    if (!validToken) {
      // Token reuse detected - revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub },
        data: { revoked: true },
      });
      throw new UnauthorizedException(
        'Refresh token is invalid or has already been used',
      );
    }

    // Revoke used token
    await this.prisma.refreshToken.update({
      where: { id: validToken.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Issue new token pair
    return this.generateTokens(user.id, user.email, userAgent, ip);
  }

  async logout(rawToken: string, userId: string) {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revoked: false },
    });

    for (const t of storedTokens) {
      if (await bcrypt.compare(rawToken, t.tokenHash)) {
        await this.prisma.refreshToken.update({
          where: { id: t.id },
          data: { revoked: true },
        });
        break;
      }
    }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        memberships: {
          include: { organization: true },
        },
      },
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    userAgent?: string,
    ip?: string,
  ) {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as any,
    });

    // Store hashed refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
