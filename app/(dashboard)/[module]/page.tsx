'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  ConciergeBell,
  CalendarDays,
  BedDouble,
  Sparkles,
  Users,
  UtensilsCrossed,
  Boxes,
  ShoppingBag,
  Wrench,
  Landmark,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const moduleMeta: Record<string, { title: string; desc: string; icon: any; roadmap: string[] }> = {
  'front-office': {
    title: 'Front Office & Desk Operations',
    desc: 'Guest check-in, check-out, express key creation, folio management, and walk-in bookings.',
    icon: ConciergeBell,
    roadmap: ['Guest Check-in & Out', 'Live House Status', 'Walk-in Bookings', 'Folio Billing'],
  },
  reservations: {
    title: 'Reservations & Booking Engine',
    desc: 'Centralized reservation system, rate plans, calendar availability, and direct booking management.',
    icon: CalendarDays,
    roadmap: ['Calendar Grid View', 'Direct Reservations', 'Group Bookings', 'Rate Management'],
  },
  rooms: {
    title: 'Rooms & Inventory Management',
    desc: 'Room directory, room types, pricing tiers, amenities, and room status configuration.',
    icon: BedDouble,
    roadmap: ['Room Categories', 'Rate Plans', 'Room Numbers & Blocks', 'Out of Order Maintenance'],
  },
  housekeeping: {
    title: 'Housekeeping & Maintenance',
    desc: 'Room cleaning tasks, dirty/clean status tracking, inspector sign-offs, and linen logs.',
    icon: Sparkles,
    roadmap: ['Cleaner Task Allocation', 'Live Clean/Dirty Toggle', 'Inspection Sign-off', 'Lost & Found'],
  },
  guests: {
    title: 'Guest Directory & Profiles',
    desc: 'Unified guest records, ID document scans, stay histories, and VIP preferences.',
    icon: Users,
    roadmap: ['Guest Master File', 'KYC Document Archive', 'Stay History', 'VIP Tags'],
  },
  pos: {
    title: 'Restaurant & Outlet POS',
    desc: 'Point-of-sale for dining, room service, bar outlets, and room charge posting.',
    icon: UtensilsCrossed,
    roadmap: ['Table Management', 'KOT Printing', 'Room Charge Posting', 'Bill Split & Settlement'],
  },
  inventory: {
    title: 'Inventory & Stock Control',
    desc: 'Hotel store inventory, linen, toiletries, F&B stock levels, and stock adjustments.',
    icon: Boxes,
    roadmap: ['Store Inventory', 'Min/Max Reorder Alerts', 'Stock In/Out Logs', 'Wastage Register'],
  },
  procurement: {
    title: 'Procurement & Purchase Orders',
    desc: 'Vendor management, purchase requests, GRN verification, and supplier invoices.',
    icon: ShoppingBag,
    roadmap: ['Vendor Database', 'Purchase Orders (PO)', 'Goods Received Note (GRN)', 'Supplier Ledger'],
  },
  maintenance: {
    title: 'Facility Maintenance & Work Orders',
    desc: 'Preventive room maintenance, repair tickets, AC/plumbing logs, and technician tasking.',
    icon: Wrench,
    roadmap: ['Repair Tickets', 'Asset Tracking', 'Preventive Schedules', 'Vendor Service Records'],
  },
  finance: {
    title: 'Financial Accounting & Ledgers',
    desc: 'General ledger, accounts receivable, night audit revenue posting, and expense registers.',
    icon: Landmark,
    roadmap: ['General Ledger', 'Night Audit Close', 'Accounts Receivable', 'Expense Tracking'],
  },
  reports: {
    title: 'Operational & Tax Reports',
    desc: 'Night audit reports, occupancy summaries, revenue per available room (RevPAR), and GST returns.',
    icon: FileSpreadsheet,
    roadmap: ['Daily Operations Summary', 'RevPAR & ADR Analysis', 'GST GSTR-1 & GSTR-3B', 'Manager Flash Report'],
  },
  analytics: {
    title: 'Analytics & Revenue Management',
    desc: 'BI analytics, booking pace curves, seasonal pricing recommendations, and channel yield.',
    icon: BarChart3,
    roadmap: ['Occupancy Forecasting', 'Pace Analysis', 'Channel Yield', 'RevPAR Metrics'],
  },
  crm: {
    title: 'Guest CRM & Loyalty',
    desc: 'Automated guest post-stay emails, loyalty points, feedback surveys, and marketing segmentations.',
    icon: UserCheck,
    roadmap: ['Automated Guest Emails', 'Feedback Collection', 'Loyalty Tier Rules', 'Special Occasion Alerts'],
  },
};

export default function DynamicModulePage() {
  const params = useParams();
  const moduleSlug = (params?.module as string) || '';

  const meta = moduleMeta[moduleSlug] || {
    title: `${moduleSlug.replace(/-/g, ' ').toUpperCase()} Module`,
    desc: 'Advanced Property Management & Financial System module.',
    icon: Layers,
    roadmap: ['Module Architecture', 'Database Schema', 'API Endpoints', 'UI Interface'],
  };

  const Icon = meta.icon;

  return (
    <div className="py-8 space-y-6">
      {/* Module Title Banner */}
      <div className="pmfs-card p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-600/30 text-brand-400 border border-brand-500/30">
                <Icon className="w-6 h-6" />
              </div>
              <Badge variant="coming-soon" className="bg-purple-900/60 text-purple-200 border-purple-700 px-3 py-1">
                Coming Soon in Next Phase
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white pt-2">
              {meta.title}
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-xl">
              {meta.desc}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-4 rounded-xl border border-slate-700 space-y-1.5 min-w-[240px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Foundation Status</span>
            </div>
            <p className="text-xs text-slate-400">
              Core database relations, RBAC guards, and reference number services established.
            </p>
          </div>
        </div>
      </div>

      {/* Planned Features Roadmap Card */}
      <div className="pmfs-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Module Capability Roadmap
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Features architected to plug directly into the Indira Lodge Core Foundation
            </p>
          </div>
          <Badge variant="info">Phase 2 Planned</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {meta.roadmap.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Architected for production DB schema</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
