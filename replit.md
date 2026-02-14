# StrategyPlan - Strategic Planning Platform

## Overview

StrategyPlan is a comprehensive multi-tenant strategic planning platform for organizational management and execution. It provides a hierarchical system for managing strategies, projects, and actions, enabling executives to define high-level strategies and leaders to implement specific projects with measurable actions. The platform offers role-based views, progress tracking, activity monitoring, and comprehensive reporting for strategic initiatives, aiming to streamline strategic planning and execution across organizations.

## User Preferences

Preferred communication style: Simple, everyday language.
Access Control: Two-layer settings system: 1) Administrator layer for managing user roles, permissions, and strategy assignments, 2) User layer for personal preferences. Four-role system with strategy-based access: Administrators have full modification power over the app and see all strategies; Co-Leads can edit projects and actions for assigned strategies only; View users have read-only access to assigned strategies; SME (Subject Matter Expert) users are for tracking only and cannot log in to the system. Administrators, Co-Leads, and View users have report writing capability. Strategy assignments are managed by administrators through the Settings page.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, Wouter for routing, Zustand for state management, Radix UI with Tailwind CSS for styling, and shadcn/ui. Forms use React Hook Form and Zod validation, with TanStack Query for data fetching.

### Backend
The backend is an Express.js REST API with TypeScript, featuring an abstracted storage interface, Zod for schema validation, and centralized error handling.

### Data Storage
PostgreSQL (via Replit's built-in Neon-backed database) is used for persistent data storage across deployments. The database is managed through Drizzle ORM with schema defined in `shared/schema.ts`.

### Deployment
The application supports Docker and DigitalOcean App Platform deployment, utilizing environment variables for configuration (`JWT_SECRET`, `INITIAL_REGISTRATION_TOKEN`, `DATA_DIR`, `NODE_ENV`).

### Multi-Tenancy Architecture
The platform supports multiple organizations with complete data isolation on a single database. All data is scoped by `organization_id`, and a Super Admin role can manage all organizations. Each organization has a unique registration token.

**Security Implementation:**
- All list endpoints first load organization-scoped data, then apply additional query filters (strategyId, assignedTo) to prevent cross-tenant data access
- Individual resource endpoints (/api/users/:id, /api/strategies/:id, /api/projects/:id) require authentication and verify organization ownership
- Non-administrator roles (Co-Lead, View) are further restricted to assigned strategies only
- Super Admins (identified via SUPER_ADMIN_EMAILS env var) have global access override for all organizations

### Authentication and Authorization
A role-based access control system uses JWT email/password authentication. Permissions are enforced at the API level based on user roles (Administrator, Co-Lead, View, SME), strategy assignments, and organization membership. SME users cannot log in.

### Security Hardening
The platform implements comprehensive security measures:

**Authentication Security:**
- JWT tokens stored in HTTP-only, Secure, SameSite=strict cookies (not localStorage)
- CSRF protection using double-submit cookie pattern with X-CSRF-Token header validation
- Password complexity validation: minimum 8 characters, uppercase, lowercase, number, and special character
- Security event logging for failed logins, successful authentications, password resets, and privilege changes

**Two-Factor Authentication (2FA):**
- Opt-in email-based 2FA using 6-digit verification codes
- Codes are sent via Resend email service and expire after 10 minutes
- Codes are hashed (SHA-256) before storage for security
- Users enable/disable 2FA in Settings > Profile tab
- Disabling 2FA requires password confirmation
- Maximum 5 verification attempts per code to prevent brute force

**Rate Limiting (Brute Force Protection):**
- Authentication endpoints: 10 requests per 15 minutes per IP
- 2FA verification: 5 requests per 15 minutes per IP
- Password reset: 3 requests per hour per IP
- General API: 500 requests per 15 minutes per IP
- Write operations (POST/PUT/PATCH/DELETE): 100 requests per 15 minutes per IP
- AI endpoints: 20 requests per minute per IP

**Input Validation:**
- All API endpoints use Zod schema validation middleware
- Structured error responses with field-level validation messages
- Security logging for validation failures

**HTTP Security Headers:**
- Content Security Policy (CSP) with strict directives (no unsafe-eval in production)
- X-Frame-Options: DENY (clickjacking prevention)
- X-Content-Type-Options: nosniff (MIME sniffing prevention)
- X-XSS-Protection: 1; mode=block (legacy browser XSS protection)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
- Strict-Transport-Security with preload (production only)

### Password Reset System
Email-based password reset flow using Resend for transactional emails. Users can request a reset link from the login page, receive an email with a secure token (expires in 30 minutes, single-use), and set a new password. Tokens are hashed before storage for security, and the system prevents email enumeration attacks by always returning a success message.

**Important:** The `APP_URL` environment variable must be set to the stable published domain (e.g., `https://strategyplanner.replit.app`) to ensure password reset links work correctly. Without this, links may use the ephemeral dev domain which changes frequently.

### Secure Registration System
Registration requires an organization-specific secret token in the URL (`/register/:token`). Administrators can manage tokens, and the first registrant for an organization becomes an Administrator. Super Admins can be designated via the `SUPER_ADMIN_EMAILS` environment variable.

### Key Data Models
Core entities include Organizations (for multi-tenancy), Users (with organization membership and optional super_admin status), User Strategy Assignments, Strategies (with Change Continuum Framework), Projects (with communication URL), Actions, Barriers, Dependencies, Meeting Notes, Activities, Template Types, Action People Assignments (for to-do list tagging), Intake Forms, and Intake Submissions. All tables include organization_id for data isolation.

### Intake Forms System
External, public-facing intake forms for collecting submissions from non-authenticated users. Key features:
- **Form Builder**: Administrators can create forms with a drag-and-drop style editor supporting 8 field types (text, textarea, select, checkbox, radio, date, number, email)
- **Public Access**: Forms are accessible via `/intake/:slug` without login. Each form has a unique slug per organization.
- **Expiration**: Optional `expiresAt` date that auto-closes the form. Only administrators can extend this date.
- **Submission Limits**: `maxSubmissionsPerEmail` (per-email cap) and `maxTotalSubmissions` (global cap). When limits use email, email becomes required.
- **Thank You Message**: Customizable message shown after successful submission.
- **Submission Management**: Administrators and Co-Leads can view submissions, change status (New → Under Review → Assigned → Dismissed), and assign submissions to a specific strategy and project.
- **Data Storage**: Form field definitions stored as JSON in `fields` column. Submission data stored as JSON snapshot in `data` column for version safety.
- **Routes**: `/intake-forms` (admin form management), `/intake-submissions` (submission management), `/intake/:slug` (public form page)

### Personalized Dashboard
The main dashboard shows a personalized "Welcome back, [Name]" greeting with two cards:
- **To-Dos (Left card)**: Actions assigned to the logged-in user (via action people assignments) that are not yet achieved, sorted by due date. Includes quick "Mark Achieved" button, overdue flag with tooltip, and click-to-navigate with flash animation.
- **Your Projects (Right card)**: Projects where the user is assigned as a resource, sorted by due date, showing hours/week allocation. Click navigates to the project with flash animation.

### People Resource Features
**Project-Level Resources**: Users can be assigned to projects with hours/week allocation for capacity planning. The people icon on project cards turns blue when resources are assigned.

**Action-Level People Tagging**: Users can be tagged to individual actions for the to-do list feature. This is a simple tag (no hours/FTE tracking). A warning appears when tagged people are not assigned at the project level. All organization users are available for tagging.

### Progress Calculation
Backend-driven progress calculation for actions, projects, and strategies, with cascading rollups and read-only display in the UI.

### Archiving System
Strategies follow an Active → Completed → Archived lifecycle, with cascading archiving to projects and actions. Archived items are hidden by default but tracked.

### Change Continuum Framework
Strategies incorporate 9 mandatory change management fields (e.g., Case for Change, Vision Statement), enforced for completion and supporting AI generation with data sanitization.

### Barriers System
A project-level risk tracking system for barriers, including description, severity, status lifecycle, owner, and resolution notes. Barriers are visible on project cards.

### Dependencies System
Tracks and visualizes relationships between projects and actions across strategies, representing "blocks" or "depends_on." Features include DependencyTags, a dedicated graph visualization page, and activity logging. **Automatic Cleanup**: Dependencies are automatically removed when strategies are archived or completed to prevent stale blockers from appearing on active items.

### Completion Tracking
- **Strategies**: Have `completionDate` timestamp set when status changes to 'Completed'
- **Projects**: Have `completionDate` timestamp set when status changes to 'C' (Complete)
- **Actions**: Have `achievedDate` timestamp set when status changes to 'achieved'
These timestamps enable the Executive Goals report to show historical completions with accurate dates.

### Executive Goals Report
The Reports > Executive Goals tab displays a rolling 18-month lookback of completed items, grouped by Executive Goal then by Strategic Priority. Shows a flat table with:
- All Executive Goal tags displayed at top
- Type badge (Priority/Project/Action) with archived indicator
- Item title, Strategic Priority (with color dot), and Project name
- Completion date timestamp
Includes completed strategies, projects, and actions from both active and archived strategies.

### View-Only Access
Strategy and Project cards offer view-only access via dedicated buttons, displaying comprehensive details in read-only modals for all users.

### Notification System
A real-time notification system for action completions, project progress, strategy status changes, and due date alerts. SME users are excluded.

### Meeting Notes (Report-Out Meetings)
Allows creation and management of report-out meeting notes tied to strategies, with dynamic selection of projects and actions, rich text fields, PDF export, and authorization controls.

### Templates Feature
A collection of strategic planning, project management, and productivity templates (e.g., Strategy on a Page, PESTLE Analysis, SWOT Analysis) accessible via the sidebar. All templates support Word document export, and administrators can manage custom template categories.

### Development Environment
The project uses Vite for development, Tailwind CSS for styling, and TypeScript for type checking.

## External Dependencies

- `@tanstack/react-query`
- `wouter`
- `react-hook-form`
- `zustand`
- `@radix-ui/*`
- `tailwindcss`
- `class-variance-authority`
- `lucide-react`
- `@neondatabase/serverless`
- `resend`
- `drizzle-orm`
- `express`
- `jsonwebtoken`
- `bcryptjs`
- `zod`
- `drizzle-zod`
- `@hookform/resolvers`
- `vite`
- `typescript`
- `react-to-print`
- `jspdf`
- `html2canvas`
- `docx`
- `openai`
- `@google/generative-ai`