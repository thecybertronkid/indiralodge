# Indira Lodge — Hotel Property Management & Financial System (PMFS)

Production-ready **Core Foundation** of the Hotel Property Management & Financial System (PMFS) built for modern hospitality groups and independent hotels.

---

## 1. Technology Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) (SQLite local zero-config, PostgreSQL production-ready)
- **Authentication**: `bcryptjs` password hashing, `jose` JWT HTTP-only encrypted session cookies, and DB `user_sessions` tracking
- **Security & RBAC**: Fine-grained `module.action` permissions & property-scoped multi-role access control

---

## 2. Project Architecture & Directory Structure

```
/
├── app/                        # Next.js App Router Pages & API Routes
│   ├── (dashboard)/            # Authenticated Application Shell
│   │   ├── dashboard/          # Real-data KPI cards & operational alerts
│   │   ├── users/              # Users & Staff management data table
│   │   ├── settings/           # Property settings, tax & security
│   │   ├── audit-logs/         # System audit trail
│   │   ├── notifications/      # In-app notifications center
│   │   └── [module]/           # Dynamic catch-all for upcoming PMFS modules
│   ├── api/                    # Server-side API endpoints
│   │   ├── setup/              # First-run initial setup wizard API
│   │   ├── auth/               # Login, Logout, Session verification
│   │   ├── users/              # User CRUD & Status toggle API
│   │   ├── properties/         # Property profile & settings API
│   │   ├── audit-logs/         # Audit trail API
│   │   ├── notifications/      # Notifications API
│   │   └── search/             # Global search autocomplete API
│   ├── login/                  # Production Login Page
│   ├── setup/                  # First-Run Setup Wizard Page
│   ├── globals.css             # Tailwind base & custom component styles
│   └── layout.tsx              # Root HTML layout with Toast Provider
├── components/                 # Reusable UI & Shell Components
│   ├── layout/                 # Sidebar & Topbar Header navigation
│   └── ui/                     # Toast alerts, Dialog Modals, Badges
├── lib/                        # Core Service Utilities
│   ├── db.ts                   # Prisma Singleton Client
│   ├── auth.ts                 # Password hashing & JWT Session handling
│   ├── permissions.ts          # System permissions list & RBAC guards
│   ├── audit.ts                # Unified audit logging service
│   ├── refGenerator.ts         # Reference number generator service
│   └── seed.ts                 # Standard roles & permissions seeder
├── prisma/
│   ├── schema.prisma           # 15 Relational DB Models & Foreign Keys
│   └── dev.db                  # Local SQLite Database
└── README.md                   # Technical Documentation
```

---

## 3. Environment Variables (`.env`)

Create a `.env` file in the root directory:

```env
# Database Connection (SQLite default or PostgreSQL connection string)
DATABASE_URL="file:./dev.db"

# JWT Secret for Session Cookies
JWT_SECRET="indira-lodge-super-secret-jwt-key-2026-production-ready"

# Environment
NODE_ENV="development"
```

To switch to PostgreSQL in production:
1. Update `DATABASE_URL` in `.env` to `postgresql://user:password@localhost:5432/indira_lodge`.
2. Change `provider = "postgresql"` in `prisma/schema.prisma`.
3. Run `cmd /c npx prisma db push`.

---

## 4. First-Run Setup & Creating the First Admin

When starting a fresh installation:
1. Access the application in browser (`http://localhost:3000`).
2. The system automatically detects an empty database and redirects to `/setup`.
3. Enter your **Hotel Information** (Name, Address, City, State, Country, ZIP, Phone, Email, Currency, Timezone, GSTIN) and **Root Administrator Credentials**.
4. Upon submission, the system atomically creates:
   - Organization record
   - Primary Property & Property Settings
   - 13 Standard Hospitality System Roles
   - Root Admin User with `Owner` / `Super Admin` permissions
   - Initial Audit Log entry
5. Once complete, `/setup` locks down and cannot be accessed again.

---

## 5. Local Development Instructions

1. **Install Dependencies**:
   ```bash
   cmd /c npm install
   ```

2. **Initialize Database**:
   ```bash
   cmd /c npx prisma db push
   ```

3. **Start Development Server**:
   ```bash
   cmd /c npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 6. Security Architecture

- **Password Safety**: Passwords are hashed using `bcrypt` (10 rounds). Plaintext passwords are never stored or logged.
- **Session Security**: Session tokens are signed using `jose` JWT and stored in HTTP-Only, `SameSite=Lax` cookies. Sessions are tracked in the `user_sessions` database table for instant remote revocation.
- **Role-Based Authorization**: Every API route enforces session validity and checks `permissions` array (`module.action`) before executing operations.
- **Audit Compliance**: All key operations (logins, logouts, staff account creations, edits, status toggles, setting changes) automatically append detailed audit records to `AuditLog`.
