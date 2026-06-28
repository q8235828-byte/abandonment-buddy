import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

    if (existingUser) {
      throw new BadRequestException(
        'User already exists',
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        dto.password,
        10,
      );

    const user =
      await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          password:
            hashedPassword,
        },
      });

    const token =
      await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      });

    return {
      message:
        'Signup successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName:
          user.fullName,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always respond the same way to avoid email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,
    });

    await transporter.sendMail({
      from: 'noreply@abandonmentbuddy.com',
      to: user.email,
      subject: 'Reset your password',
      html: `
        <p>Hi ${user.fullName ?? user.email},</p>
        <p>Click the link below to reset your password. The link expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: 'Password reset successful. You can now log in.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName ?? null },
      select: { id: true, email: true, fullName: true },
    });
    return { message: 'Profile updated', user };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    return { message: 'Password changed successfully' };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email });

    // Track login IP + country (non-blocking)
    if (ip) {
      AdminService.lookupIp(ip).then((geo) => {
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginIp: ip,
            lastLoginAt: new Date(),
            ...(geo ? { country: geo.country, city: geo.city } : {}),
          },
        }).catch(() => {});
      });
    }

    return {
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, isAdmin: user.isAdmin },
    };
  }

  async loginWithGoogle(googleUser: { email: string; fullName: string; googleId: string }) {
    let user = await this.prisma.user.findUnique({ where: { email: googleUser.email } });

    if (!user) {
      // Create account automatically — no password needed for OAuth users
      user = await this.prisma.user.create({
        data: {
          email:    googleUser.email,
          fullName: googleUser.fullName,
          password: '', // OAuth users have no password
        },
      });
    }

    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, isAdmin: user.isAdmin },
    };
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      smtpHost:     user.smtpHost,
      smtpPort:     user.smtpPort,
      smtpUser:     user.smtpUser,
      smtpFrom:     user.smtpFrom,
      smtpSecure:   user.smtpSecure,
      smtpVerified: user.smtpVerified,
      twilioAccountSid:  user.twilioAccountSid,
      twilioFromPhone:   user.twilioFromPhone,
      twilioWhatsappNum: user.twilioWhatsappNum,
      // never return twilioAuthToken or smtpPass
    };
  }

  async testEmail(userId: string, to?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const host     = user.smtpHost   || process.env.SMTP_HOST;
    const port     = user.smtpPort   || Number(process.env.SMTP_PORT) || 587;
    const secure   = user.smtpSecure ?? (process.env.SMTP_SECURE === 'true');
    const smtpUser = user.smtpUser   || process.env.SMTP_USER;
    const smtpPass = user.smtpPass   || process.env.SMTP_PASS;
    const from     = user.smtpFrom   || smtpUser;

    if (!host || !smtpUser || !smtpPass) {
      throw new BadRequestException('SMTP not configured. Save your credentials in Settings → Email first.');
    }

    const recipient = to && to.includes('@') ? to : user.email;

    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Abandonment Buddy" <${from}>`,
      to: recipient,
      subject: 'SMTP test — Abandonment Buddy',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#0f172a;margin-bottom:8px;">SMTP is working ✓</h2>
          <p style="color:#475569;">This test email was sent from your Abandonment Buddy dashboard.</p>
          <p style="color:#475569;">Your cart recovery emails will be delivered using these same SMTP settings.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="color:#94a3b8;font-size:12px;">Sent via ${host}:${port}</p>
        </div>`,
    });

    return { success: true, sentTo: recipient };
  }

  async updateSettings(userId: string, dto: any) {
    const data: any = {};

    // Email
    if (dto.smtpHost    !== undefined) data.smtpHost    = dto.smtpHost;
    if (dto.smtpPort    !== undefined) data.smtpPort    = Number(dto.smtpPort) || 587;
    if (dto.smtpUser    !== undefined) data.smtpUser    = dto.smtpUser;
    if (dto.smtpFrom    !== undefined) data.smtpFrom    = dto.smtpFrom;
    if (dto.smtpSecure  !== undefined) data.smtpSecure  = Boolean(dto.smtpSecure);
    if (dto.smtpPass)                  data.smtpPass    = dto.smtpPass;
    if ('smtpHost' in dto)             data.smtpVerified = false;

    // Twilio SMS / WhatsApp
    if (dto.twilioAccountSid  !== undefined) data.twilioAccountSid  = dto.twilioAccountSid;
    if (dto.twilioAuthToken)                 data.twilioAuthToken   = dto.twilioAuthToken;
    if (dto.twilioFromPhone   !== undefined) data.twilioFromPhone   = dto.twilioFromPhone;
    if (dto.twilioWhatsappNum !== undefined) data.twilioWhatsappNum = dto.twilioWhatsappNum;

    await this.prisma.user.update({ where: { id: userId }, data });
    return { success: true };
  }
}