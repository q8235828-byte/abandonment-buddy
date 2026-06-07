import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException('Not authenticated');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, email: true },
    });

    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = user?.isAdmin || (adminEmail && user?.email === adminEmail);

    if (!isAdmin) throw new ForbiddenException('Admin access required');
    return true;
  }
}
