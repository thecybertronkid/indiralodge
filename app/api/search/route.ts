import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const cleanQ = query.trim();

    // 1. Search Users
    const users = await db.user.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          { fullName: { contains: cleanQ } },
          { email: { contains: cleanQ } },
          { phone: { contains: cleanQ } },
        ],
      },
      select: { id: true, fullName: true, email: true, status: true },
      take: 5,
    });

    // 2. Search Properties
    const properties = await db.property.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          { name: { contains: cleanQ } },
          { city: { contains: cleanQ } },
          { code: { contains: cleanQ } },
        ],
      },
      select: { id: true, name: true, city: true, code: true },
      take: 5,
    });

    // 3. Search Audit Logs
    const auditLogs = await db.auditLog.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          { action: { contains: cleanQ } },
          { module: { contains: cleanQ } },
        ],
      },
      select: { id: true, action: true, module: true, createdAt: true },
      take: 5,
    });

    const results = [
      ...users.map((u) => ({
        id: u.id,
        title: u.fullName,
        subtitle: `User (${u.email})`,
        category: 'Users',
        url: `/users?search=${encodeURIComponent(u.email)}`,
      })),
      ...properties.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `Property (${p.city})`,
        category: 'Properties',
        url: `/settings`,
      })),
      ...auditLogs.map((a) => ({
        id: a.id,
        title: a.action.replace(/_/g, ' '),
        subtitle: `Audit Log (${a.module})`,
        category: 'Audit Logs',
        url: `/audit-logs`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
