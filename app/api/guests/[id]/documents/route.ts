import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'guest.documents.manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const guestId = params.id;
    const body = await req.json();
    const { documentType, documentNumber, issuingCountry, expiryDate, fileReference } = body;

    if (!documentType || !documentNumber) {
      return NextResponse.json({ error: 'Document type and document number are required.' }, { status: 400 });
    }

    const doc = await db.guestDocument.create({
      data: {
        guestId,
        documentType,
        documentNumber: documentNumber.trim(),
        issuingCountry: issuingCountry || 'India',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileReference: fileReference || null,
        verificationStatus: 'VERIFIED',
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: 'GUEST_DOCUMENT_ADDED',
      module: 'guests',
      entityId: guestId,
      afterData: { documentType, issuingCountry },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save guest document' }, { status: 500 });
  }
}
