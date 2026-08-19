import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = params.id;
    const body = await req.json();
    const { comment, attachmentUrl } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const ticketComment = await db.maintenanceComment.create({
      data: {
        ticketId,
        userId: session.userId,
        comment: comment.trim(),
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        user: { select: { fullName: true } },
      },
    });

    return NextResponse.json({ success: true, comment: ticketComment });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
