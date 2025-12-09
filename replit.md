# TokenVault - Off-Chain RWA Tokenization Platform

## Overview

TokenVault is a fully off-chain Real-World Asset (RWA) tokenization and trading platform. It mimics blockchain tokenization logic but stores all states in PostgreSQL, eliminating the need for blockchain, wallets, or on-chain fees. The platform enables fractional ownership trading of real estate, commodities, and loans with enterprise-grade KYC compliance following ERC-3643-like identity and permission logic.

## Recent Changes (December 2024)

### Security Hardening
- All admin endpoints properly gated with `adminMiddleware`
- `/api/admin/transfers` endpoint is admin-only (no public transfer ledger access)
- All reporting endpoints have proper authorization scoping
- Privilege escalation prevention via `publicRegistrationSchema`

### Advanced Marketplace Features
- Price history tracking with interactive charts (Recharts)
- Bid/ask spread display for each asset
- Market data API with historical pricing

### KYC Document System
- Document upload with file validation
- Admin review interface for documents
- Status-based upload restrictions

### Analytics & Reporting
- NAV history tracking per asset
- Performance metrics dashboard
- CSV export for portfolio, tax, compliance reports
- Investor reports: portfolio and tax summaries
- Admin reports: transaction logs and compliance data

### Real-time Notifications
- In-app notification dropdown with bell icon
- Unread count badge
- Notification history with mark-as-read functionality

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: Zustand for auth state, TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Design System**: IBM Carbon Design System principles for enterprise data clarity
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful JSON API under `/api` prefix
- **Authentication**: JWT tokens with bcrypt password hashing
- **Authorization**: Role-based access control (ADMIN/INVESTOR roles)
- **Middleware Pattern**: Custom auth middleware for protected routes with KYC status checks

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions and Zod validation schemas
- **Key Entities**:
  - Users (with role, KYC status, frozen status)
  - Assets (real_estate, commodity, loan types)
  - Tokens (fractional ownership records)
  - Orders (marketplace buy/sell orders)
  - Transfers (audit trail for all token movements)

### Authentication & Authorization
- JWT-based authentication with 7-day token expiration
- Public registration creates INVESTOR role with PENDING KYC status
- Admin-only routes protected by `adminMiddleware`
- KYC-approved routes protected by `kycApprovedMiddleware`
- Account freezing capability for compliance

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend
- **Production Build**: esbuild bundles server, Vite builds client to `dist/public`
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared directory

## External Dependencies

### Database
- PostgreSQL (connection via `DATABASE_URL` environment variable)
- `connect-pg-simple` for session storage
- `drizzle-orm` and `drizzle-kit` for database operations

### Authentication
- `jsonwebtoken` for JWT token generation/verification
- `bcryptjs` for password hashing
- `SESSION_SECRET` environment variable required for JWT security

### Frontend Libraries
- Full shadcn/ui component suite (Radix UI primitives)
- `@tanstack/react-query` for data fetching
- `react-hook-form` with `@hookform/resolvers` for forms
- `zod` for schema validation (shared between client/server)
- `date-fns` for date formatting
- `lucide-react` for icons

### Development Tools
- Replit-specific Vite plugins for development experience
- TypeScript with strict mode enabled