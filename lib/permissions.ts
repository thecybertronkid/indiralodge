export interface PermissionDef {
  code: string;
  name: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { code: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', description: 'Access main hotel dashboard KPIs and alerts' },

  // Users & Staff
  { code: 'users.view', name: 'View Users', module: 'users', description: 'View staff members and roles' },
  { code: 'users.create', name: 'Create Users', module: 'users', description: 'Add new staff members' },
  { code: 'users.edit', name: 'Edit Users', module: 'users', description: 'Update staff member details and roles' },
  { code: 'users.delete', name: 'Delete/Deactivate Users', module: 'users', description: 'Deactivate or manage user access' },

  // Phase 2: Guests & Documents
  { code: 'guest.view', name: 'View Guests', module: 'guests', description: 'Access guest profiles and stay histories' },
  { code: 'guest.create', name: 'Create Guests', module: 'guests', description: 'Create new guest profiles' },
  { code: 'guest.edit', name: 'Edit Guests', module: 'guests', description: 'Modify guest details and preferences' },
  { code: 'guest.documents.view', name: 'View Guest Documents', module: 'guests', description: 'Access guest government ID verification files' },
  { code: 'guest.documents.manage', name: 'Manage Guest Documents', module: 'guests', description: 'Upload and verify guest documents' },

  // Phase 2: Rooms & Inventory
  { code: 'room.view', name: 'View Rooms', module: 'rooms', description: 'View room list, types, and operational status' },
  { code: 'room.create', name: 'Create Rooms', module: 'rooms', description: 'Add new rooms or room types' },
  { code: 'room.edit', name: 'Edit Rooms', module: 'rooms', description: 'Update room rates, capacities, or details' },
  { code: 'room.status.manage', name: 'Manage Room Status', module: 'rooms', description: 'Update clean/dirty/maintenance states' },
  { code: 'room.block', name: 'Block Rooms', module: 'rooms', description: 'Place rooms under maintenance or owner block' },

  // Phase 2: Reservations & Bookings
  { code: 'reservation.view', name: 'View Reservations', module: 'reservations', description: 'View bookings and guest reservations' },
  { code: 'reservation.create', name: 'Create Reservations', module: 'reservations', description: 'Make new guest bookings' },
  { code: 'reservation.edit', name: 'Edit Reservations', module: 'reservations', description: 'Modify booking dates, rates, or guests' },
  { code: 'reservation.cancel', name: 'Cancel Reservation', module: 'reservations', description: 'Process reservation cancellations' },
  { code: 'reservation.no_show', name: 'Process No-show', module: 'reservations', description: 'Mark unarrived bookings as no-show' },
  { code: 'reservation.assign_room', name: 'Assign Room', module: 'reservations', description: 'Assign physical room numbers to bookings' },
  { code: 'reservation.discount', name: 'Apply Discount', module: 'reservations', description: 'Apply rate discounts to reservations' },

  // Phase 2: Front Desk Operations
  { code: 'frontdesk.view', name: 'View Front Desk', module: 'front_office', description: 'Access front office dashboard and arrival/departure feeds' },
  { code: 'checkin.create', name: 'Process Check-in', module: 'front_office', description: 'Execute guest check-in & key assignment' },
  { code: 'checkout.create', name: 'Process Check-out', module: 'front_office', description: 'Execute guest check-out and folio settlement' },
  { code: 'checkout.override_balance', name: 'Override Unpaid Checkout', module: 'front_office', description: 'Allow check-out with pending balance' },
  { code: 'room.transfer', name: 'Transfer Room', module: 'front_office', description: 'Move active guest stay to another room' },
  { code: 'stay.extend', name: 'Extend Stay', module: 'front_office', description: 'Extend guest check-out date' },
  { code: 'room_order.create', name: 'Add Room Order', module: 'front_office', description: 'Add room orders, food, beverages, and extra charges to guest room' },

  // Phase 2 & Phase 4: Folios & Financials
  { code: 'folio.view', name: 'View Guest Folio', module: 'finance', description: 'View guest stay charges and balances' },
  { code: 'folio.charge', name: 'Post Folio Charge', module: 'finance', description: 'Post room or service charges to guest folio' },
  { code: 'folio.payment', name: 'Record Folio Payment', module: 'finance', description: 'Record cash, card, or UPI payments' },
  { code: 'folio.void', name: 'Void Folio Transaction', module: 'finance', description: 'Void or reverse posted folio transactions' },

  // Phase 3: Housekeeping Permissions
  { code: 'housekeeping.view', name: 'View Housekeeping Hub', module: 'housekeeping', description: 'Access housekeeping dashboard and task board' },
  { code: 'housekeeping.tasks.view', name: 'View Housekeeping Tasks', module: 'housekeeping', description: 'View cleaning tasks and schedules' },
  { code: 'housekeeping.tasks.create', name: 'Create Housekeeping Task', module: 'housekeeping', description: 'Create room cleaning or special request tasks' },
  { code: 'housekeeping.tasks.assign', name: 'Assign Housekeeping Staff', module: 'housekeeping', description: 'Assign rooms/tasks to housekeepers' },
  { code: 'housekeeping.tasks.manage', name: 'Manage Housekeeping Tasks', module: 'housekeeping', description: 'Start, complete, or update cleaning status' },
  { code: 'housekeeping.inspection.view', name: 'View Room Inspections', module: 'housekeeping', description: 'Access supervisor room inspection logs' },
  { code: 'housekeeping.inspection.manage', name: 'Execute Room Inspection', module: 'housekeeping', description: 'Approve (Pass) or reject (Fail) room cleaning' },
  { code: 'housekeeping.checklist.manage', name: 'Manage Checklists', module: 'housekeeping', description: 'Configure inspection item checklists' },
  { code: 'housekeeping.lost_found.view', name: 'View Lost & Found', module: 'housekeeping', description: 'Access lost & found item register' },
  { code: 'housekeeping.lost_found.manage', name: 'Manage Lost & Found', module: 'housekeeping', description: 'Register found items and record guest handovers' },
  { code: 'housekeeping.reports.view', name: 'View Housekeeping Reports', module: 'housekeeping', description: 'Access cleaning performance and readiness reports' },

  // Phase 3: Maintenance Permissions
  { code: 'maintenance.view', name: 'View Maintenance Hub', module: 'maintenance', description: 'Access maintenance tickets and dashboards' },
  { code: 'maintenance.ticket.view', name: 'View Tickets', module: 'maintenance', description: 'View repair tickets and work orders' },
  { code: 'maintenance.ticket.create', name: 'Create Ticket', module: 'maintenance', description: 'Report equipment or room maintenance issues' },
  { code: 'maintenance.ticket.assign', name: 'Assign Technician', module: 'maintenance', description: 'Assign maintenance tickets to technicians' },
  { code: 'maintenance.ticket.manage', name: 'Manage Tickets', module: 'maintenance', description: 'Update work status, comments, and costs' },
  { code: 'maintenance.ticket.resolve', name: 'Resolve Ticket', module: 'maintenance', description: 'Mark repairs complete and verify resolution' },
  { code: 'maintenance.ticket.reopen', name: 'Reopen Ticket', module: 'maintenance', description: 'Reopen unresolved maintenance tickets' },
  { code: 'maintenance.asset.view', name: 'View Assets', module: 'maintenance', description: 'Access equipment asset register' },
  { code: 'maintenance.asset.manage', name: 'Manage Assets', module: 'maintenance', description: 'Register assets, serial numbers, and warranties' },
  { code: 'maintenance.preventive.manage', name: 'Manage Preventive Plans', module: 'maintenance', description: 'Set up recurring preventive maintenance schedules' },
  { code: 'maintenance.reports.view', name: 'View Maintenance Reports', module: 'maintenance', description: 'Access repair tickets and cost analytics reports' },
  { code: 'maintenance.cost.view', name: 'View Maintenance Costs', module: 'maintenance', description: 'Access labour, parts, and total repair expenses' },

  // Phase 4: Finance & Accounting Permissions
  { code: 'finance.view', name: 'View Finance Hub', module: 'finance', description: 'Access finance dashboard and financial overview' },
  { code: 'finance.dashboard.view', name: 'View Finance Dashboard', module: 'finance', description: 'View real-time financial KPIs and revenue/expense charts' },
  { code: 'accounts.view', name: 'View Chart of Accounts', module: 'finance', description: 'Access chart of accounts hierarchy' },
  { code: 'accounts.create', name: 'Create Account', module: 'finance', description: 'Add new accounts to chart of accounts' },
  { code: 'accounts.edit', name: 'Edit Account', module: 'finance', description: 'Modify chart of account details' },
  { code: 'journal.view', name: 'View Journal Entries', module: 'finance', description: 'View general ledger journal entries' },
  { code: 'journal.create', name: 'Create Journal Entry', module: 'finance', description: 'Prepare double-entry manual journal entries' },
  { code: 'journal.approve', name: 'Approve Journal Entry', module: 'finance', description: 'Approve pending journal entries' },
  { code: 'journal.post', name: 'Post Journal Entry', module: 'finance', description: 'Post journal entries to general ledger' },
  { code: 'journal.reverse', name: 'Reverse Journal Entry', module: 'finance', description: 'Generate reversing journal entries' },
  { code: 'invoice.view', name: 'View Tax Invoices', module: 'finance', description: 'Access GST tax invoices' },
  { code: 'invoice.create', name: 'Create Tax Invoice', module: 'finance', description: 'Generate tax invoices for guest stays' },
  { code: 'invoice.issue', name: 'Issue Tax Invoice', module: 'finance', description: 'Issue tax invoices to guests/corporate customers' },
  { code: 'invoice.cancel', name: 'Cancel Tax Invoice', module: 'finance', description: 'Process invoice cancellations' },
  { code: 'credit_note.create', name: 'Create Credit Note', module: 'finance', description: 'Issue credit notes for refunds or overbilling' },
  { code: 'debit_note.create', name: 'Create Debit Note', module: 'finance', description: 'Issue debit notes for charge adjustments' },
  { code: 'expense.view', name: 'View Expenses', module: 'finance', description: 'Access hotel operating expenses' },
  { code: 'expense.create', name: 'Create Expense', module: 'finance', description: 'Submit expense claims and supplier bills' },
  { code: 'expense.approve', name: 'Approve Expense', module: 'finance', description: 'Approve submitted operational expenses' },
  { code: 'expense.post', name: 'Post Expense', module: 'finance', description: 'Post approved expenses to general ledger' },
  { code: 'receivable.view', name: 'View Accounts Receivable', module: 'finance', description: 'Access guest and corporate receivable aging' },
  { code: 'payable.view', name: 'View Accounts Payable', module: 'finance', description: 'Access vendor accounts payable' },
  { code: 'vendor.view', name: 'View Vendors', module: 'finance', description: 'Access vendor master list' },
  { code: 'vendor.manage', name: 'Manage Vendors', module: 'finance', description: 'Register and update supplier/vendor profiles' },
  { code: 'cash.view', name: 'View Cash Management', module: 'finance', description: 'Access cashier shifts and cash balances' },
  { code: 'cash.manage', name: 'Manage Cashier Shifts', module: 'finance', description: 'Open, operate, and close cashier shifts' },
  { code: 'bank.view', name: 'View Bank Accounts', module: 'finance', description: 'Access bank accounts and statement balances' },
  { code: 'bank.reconcile', name: 'Reconcile Bank Accounts', module: 'finance', description: 'Execute bank statement reconciliation' },
  { code: 'tax.view', name: 'View Tax Configurations', module: 'finance', description: 'Access Indian GST tax rules and rates' },
  { code: 'tax.manage', name: 'Manage Tax Rates', module: 'finance', description: 'Configure CGST, SGST, IGST rates' },
  { code: 'accounting_period.close', name: 'Close Accounting Period', module: 'finance', description: 'Close and lock accounting periods' },
  { code: 'financial_reports.view', name: 'View Financial Statements', module: 'finance', description: 'Access Trial Balance, Profit & Loss, and Balance Sheet' },

  // Phase 5: Business Intelligence & Analytics Permissions
  { code: 'analytics.view', name: 'View Business Intelligence Hub', module: 'analytics', description: 'Access executive command centre and BI reports' },
  { code: 'analytics.financial', name: 'View Financial Analytics', module: 'analytics', description: 'Access revenue vs expense trends and profit margin analytics' },
  { code: 'analytics.operational', name: 'View Operational Analytics', module: 'analytics', description: 'Access room turnaround and maintenance resolution analytics' },
  { code: 'analytics.guest', name: 'View Guest Intelligence', module: 'analytics', description: 'Access guest spend segmentation and repeat stay analytics' },
  { code: 'analytics.housekeeping', name: 'View Housekeeping Analytics', module: 'analytics', description: 'Access housekeeper workload and inspection pass rates' },
  { code: 'analytics.maintenance', name: 'View Maintenance Analytics', module: 'analytics', description: 'Access equipment failure frequencies and asset repair costs' },
  { code: 'reports.create', name: 'Create Custom Reports', module: 'reports', description: 'Build custom dataset queries in Report Builder' },
  { code: 'reports.export', name: 'Export Analytics Reports', module: 'reports', description: 'Export analytics data to CSV/Excel' },
  { code: 'reports.builder', name: 'Access Report Builder', module: 'reports', description: 'Use custom report builder dimensions and metrics' },
  { code: 'dashboard.owner', name: 'Access Owner Command Centre', module: 'dashboard', description: 'Executive high-level profit, cash, and performance dashboard' },
  { code: 'dashboard.manager', name: 'Access GM Operational Dashboard', module: 'dashboard', description: 'General Manager operational readiness and arrivals feed' },
  { code: 'forecast.view', name: 'View Occupancy & Revenue Forecast', module: 'analytics', description: 'Access 7-day and 30-day forecasting engine' },
  { code: 'kpi_targets.view', name: 'View KPI Targets', module: 'analytics', description: 'View management scorecard targets vs actuals' },
  { code: 'kpi_targets.manage', name: 'Manage KPI Targets', module: 'analytics', description: 'Set occupancy %, ADR, and turnaround target thresholds' },

  // Reports & Analytics & System
  { code: 'reports.view', name: 'View Reports', module: 'reports', description: 'View Front Office occupancy and revenue reports' },
  { code: 'settings.view', name: 'View Settings', module: 'settings', description: 'View hotel profile and system settings' },
  { code: 'settings.edit', name: 'Edit Settings', module: 'settings', description: 'Modify hotel profile, tax, and property configuration' },
  { code: 'audit_logs.view', name: 'View Audit Logs', module: 'audit_logs', description: 'Access system activity and security audit trail' },
];

export const INITIAL_ROLES = [
  { name: 'Super Admin', description: 'Full system access across all properties and administrative configurations.' },
  { name: 'Owner', description: 'Full hotel access, financial reports, and settings.' },
  { name: 'General Manager', description: 'Operational oversight and staff management access.' },
  { name: 'Front Office Manager', description: 'Reservations, front desk, and guest operations management.' },
  { name: 'Receptionist', description: 'Check-in, check-out, bookings, and front desk service.' },
  { name: 'Housekeeping Manager', description: 'Housekeeping schedule and room inspection management.' },
  { name: 'Housekeeper', description: 'Assigned room cleaning and status updates.' },
  { name: 'Accountant', description: 'Financial transactions, general ledger, and accounting entries.' },
  { name: 'Finance Manager', description: 'Financial approvals, period locks, and financial statements.' },
  { name: 'Restaurant Manager', description: 'POS, food & beverage operations, and dining billing.' },
  { name: 'Cashier', description: 'Billing, invoicing, and guest payment collection.' },
  { name: 'Inventory Manager', description: 'Stock, supplies, and warehouse inventory control.' },
  { name: 'Purchase Manager', description: 'Vendor relations, purchase orders, and procurement.' },
  { name: 'Maintenance Manager', description: 'Facility maintenance tickets and room repairs.' },
  { name: 'Technician', description: 'Assigned maintenance ticket execution and equipment repairs.' },
];

export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  'Super Admin': ['*'],
  'Owner': ['*'],
  'General Manager': [
    'dashboard.view', 'dashboard.manager', 'kpi_targets.view', 'forecast.view',
    'frontdesk.view', 'checkin.create', 'checkout.create', 'room.transfer', 'stay.extend', 'room_order.create',
    'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.cancel', 'reservation.no_show', 'reservation.assign_room', 'reservation.discount',
    'room.view', 'room.edit', 'room.status.manage', 'room.block',
    'guest.view', 'guest.create', 'guest.edit', 'guest.documents.view', 'guest.documents.manage',
    'housekeeping.view', 'housekeeping.tasks.view', 'housekeeping.tasks.create', 'housekeeping.tasks.assign', 'housekeeping.tasks.manage', 'housekeeping.inspection.view', 'housekeeping.inspection.manage', 'housekeeping.lost_found.view', 'housekeeping.lost_found.manage', 'housekeeping.reports.view',
    'maintenance.view', 'maintenance.ticket.view', 'maintenance.ticket.create', 'maintenance.ticket.assign', 'maintenance.ticket.manage', 'maintenance.ticket.resolve', 'maintenance.asset.view', 'maintenance.reports.view', 'maintenance.cost.view',
    'reports.view', 'reports.export', 'reports.create', 'reports.builder',
    'analytics.view', 'analytics.operational', 'analytics.guest', 'analytics.housekeeping', 'analytics.maintenance',
    'folio.view', 'folio.charge', 'folio.payment',
    'users.view',
  ],
  'Front Office Manager': [
    'dashboard.view',
    'frontdesk.view', 'checkin.create', 'checkout.create', 'checkout.override_balance', 'room.transfer', 'stay.extend', 'room_order.create',
    'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.cancel', 'reservation.no_show', 'reservation.assign_room', 'reservation.discount',
    'room.view', 'room.status.manage', 'room.block',
    'guest.view', 'guest.create', 'guest.edit', 'guest.documents.view', 'guest.documents.manage',
    'folio.view', 'folio.charge', 'folio.payment',
    'reports.view', 'reports.export',
  ],
  'Receptionist': [
    'dashboard.view',
    'frontdesk.view', 'checkin.create', 'checkout.create', 'room.transfer', 'stay.extend', 'room_order.create',
    'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.cancel', 'reservation.no_show', 'reservation.assign_room',
    'room.view', 'room.status.manage',
    'guest.view', 'guest.create', 'guest.edit', 'guest.documents.view', 'guest.documents.manage',
    'folio.view', 'folio.charge', 'folio.payment',
  ],
  'Housekeeping Manager': [
    'dashboard.view',
    'room.view', 'room.status.manage',
    'housekeeping.view', 'housekeeping.tasks.view', 'housekeeping.tasks.create', 'housekeeping.tasks.assign', 'housekeeping.tasks.manage', 'housekeeping.inspection.view', 'housekeeping.inspection.manage', 'housekeeping.checklist.manage', 'housekeeping.lost_found.view', 'housekeeping.lost_found.manage', 'housekeeping.reports.view',
    'reports.view',
  ],
  'Housekeeper': [
    'dashboard.view',
    'room.view', 'room.status.manage',
    'housekeeping.view', 'housekeeping.tasks.view', 'housekeeping.tasks.manage', 'housekeeping.lost_found.view', 'housekeeping.lost_found.manage',
  ],
  'Maintenance Manager': [
    'dashboard.view',
    'room.view', 'room.block', 'room.status.manage',
    'maintenance.view', 'maintenance.ticket.view', 'maintenance.ticket.create', 'maintenance.ticket.assign', 'maintenance.ticket.manage', 'maintenance.ticket.resolve', 'maintenance.ticket.reopen', 'maintenance.asset.view', 'maintenance.asset.manage', 'maintenance.preventive.manage', 'maintenance.reports.view', 'maintenance.cost.view',
    'reports.view',
  ],
  'Technician': [
    'dashboard.view',
    'room.view',
    'maintenance.view', 'maintenance.ticket.view', 'maintenance.ticket.manage', 'maintenance.ticket.resolve', 'maintenance.asset.view',
  ],
  'Finance Manager': [
    'dashboard.view',
    'folio.view', 'folio.charge', 'folio.payment', 'folio.void',
    'finance.view', 'finance.dashboard.view', 'accounts.view', 'accounts.create', 'accounts.edit', 'journal.view', 'journal.create', 'journal.approve', 'journal.post', 'journal.reverse', 'invoice.view', 'invoice.create', 'invoice.issue', 'invoice.cancel', 'credit_note.create', 'debit_note.create', 'expense.view', 'expense.create', 'expense.approve', 'expense.post', 'receivable.view', 'payable.view', 'vendor.view', 'vendor.manage', 'cash.view', 'cash.manage', 'bank.view', 'bank.reconcile', 'tax.view', 'tax.manage', 'accounting_period.close', 'financial_reports.view',
    'reports.view', 'reports.export', 'reports.create', 'reports.builder',
    'analytics.view', 'analytics.financial',
  ],
  'Accountant': [
    'dashboard.view',
    'folio.view', 'folio.charge', 'folio.payment',
    'finance.view', 'finance.dashboard.view', 'accounts.view', 'journal.view', 'journal.create', 'invoice.view', 'invoice.create', 'invoice.issue', 'credit_note.create', 'debit_note.create', 'expense.view', 'expense.create', 'receivable.view', 'payable.view', 'vendor.view', 'cash.view', 'bank.view', 'tax.view', 'financial_reports.view',
    'reports.view', 'reports.export',
  ],
  'Cashier': [
    'dashboard.view',
    'frontdesk.view',
    'folio.view', 'folio.payment', 'folio.charge',
    'invoice.view', 'invoice.create', 'invoice.issue',
    'cash.view', 'cash.manage',
  ],
  'Inventory Manager': [
    'dashboard.view',
    'housekeeping.lost_found.view', 'housekeeping.lost_found.manage',
    'maintenance.asset.view', 'maintenance.asset.manage',
    'vendor.view',
    'reports.view',
  ],
  'Purchase Manager': [
    'dashboard.view',
    'vendor.view', 'vendor.manage',
    'expense.view', 'expense.create',
    'maintenance.asset.view',
    'reports.view',
  ],
  'Restaurant Manager': [
    'dashboard.view',
    'folio.view', 'folio.charge', 'room_order.create',
    'reports.view',
  ],
};

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes('*') || userPermissions.includes('all')) return true;
  return userPermissions.includes(requiredPermission);
}
