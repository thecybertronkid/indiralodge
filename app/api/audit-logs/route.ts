import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'audit_logs.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module') || '';
    const search = searchParams.get('search') || '';

    const auditLogs = await db.auditLog.findMany({
      where: {
        organizationId: session.organizationId,
        ...(module ? { module } : {}),
        ...(search
          ? {
              OR: [
                { action: { contains: search } },
                { module: { contains: search } },
                { entityId: { contains: search } },
                { user: { fullName: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { fullName: true, email: true } },
        property: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ auditLogs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
