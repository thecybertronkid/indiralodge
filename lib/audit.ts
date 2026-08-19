import { db } from './db';

export interface AuditParams {
  organizationId: string;
  propertyId?: string | null;
  userId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  try {
    const beforeStr = params.beforeData ? JSON.stringify(params.beforeData) : null;
    const afterStr = params.afterData ? JSON.stringify(params.afterData) : null;

    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        propertyId: params.propertyId || null,
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        entityId: params.entityId || null,
        beforeData: beforeStr,
        afterData: afterStr,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });

    // Also log user readable activity
    if (params.propertyId) {
      await db.activityLog.create({
        data: {
          propertyId: params.propertyId,
          userId: params.userId || null,
          activity: params.action.replace(/_/g, ' ').toLowerCase(),
          details: `${params.module}: ${params.action}`,
        },
      });
    }
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
