# StrategyPlan - Strategic Planning Platform

## Overview
StrategyPlan is a comprehensive multi-tenant strategic planning platform designed to streamline strategic planning and execution for organizations. It provides a hierarchical system for managing strategies, projects, and actions, enabling executives to define high-level strategies and leaders to implement specific projects with measurable actions. The platform offers role-based views, progress tracking, activity monitoring, and comprehensive reporting. It is intended as a self-hosted internal tool with no billing, subscriptions, or feature limits, offering unlimited strategies, projects, and users.

## User Preferences
Preferred communication style: Simple, everyday language.
Access Control: Two-layer settings system: 1) Administrator layer for managing user roles, permissions, and strategy assignments, 2) User layer for personal preferences. Four-role system with strategy-based access: Administrators have full modification power over the app and see all strategies; Co-Leads can edit projects and actions for assigned strategies only; View users have read-only access to assigned strategies; SME (Subject Matter Expert) users are for tracking only and cannot log in to the system. Administrators, Co-Leads, and View users have report writing capability. Strategy assignments are managed by administrators through the Settings page.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, Wouter for routing, Zustand for state management, Radix UI with Tailwind CSS for styling, and shadcn/ui. Forms use React Hook Form and Zod validation, with TanStack Query for data fetching.

### Backend
The backend is an Express.js REST API with TypeScript, featuring an abstracted storage interface, Zod for schema validation, and centralized error handling.

### Data Storage
SQLite (via better-sqlite3) is used for persistent data storage, managed through Drizzle ORM. The database schema is defined in `shared/schema.ts`, with tables created via explicit `CREATE TABLE IF NOT EXISTS` statements.

### Multi-Tenancy Architecture
The platform supports multiple organizations with complete data isolation on a single database, scoped by `organization_id`. A Super Admin role can manage all organizations. Security is enforced through organization-scoped data loading and role-based access to prevent cross-tenant data access.

### Authentication and Authorization
A JWT email/password authentication system is used, with permissions enforced at the API level based on user roles (Administrator, Co-Lead, View, SME), strategy assignments, and organization membership. SME users cannot log in. Security measures include HTTP-only cookies, CSRF protection, password complexity validation, and security event logging. Email-based 2FA and comprehensive rate limiting are implemented for brute force protection.

### Security Hardening
Input validation is enforced using Zod schema validation middleware across all API endpoints. HTTP Security Headers like CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, and Strict-Transport-Security are implemented.

### Key Features
- **Password Reset System**: Email-based flow with secure, expiring tokens.
- **Secure Registration**: Requires an organization-specific token for user registration, with the first registrant becoming an Administrator.
- **Intake Forms System**: External, public-facing forms with a form builder, submission management, and various limits (e.g., expiration, submission caps).
- **Personalized Dashboard**: Displays assigned "To-Dos" and "Your Projects" for the logged-in user.
- **People Resource Features**: Allows users to be assigned to projects (with hours/week allocation) and actions (for to-do list tagging).
- **Progress Calculation**: Backend-driven cascading progress calculation for actions, projects, and strategies.
- **Archiving System**: Manages the Active → Completed → Archived lifecycle for strategies, projects, and actions.
- **Change Continuum Framework**: Strategies incorporate 9 mandatory change management fields for completion and AI generation.
- **Barriers System**: Project-level risk tracking with description, severity, status, owner, and resolution notes.
- **Dependencies System**: Tracks and visualizes relationships between projects and actions, with automatic cleanup.
- **Completion Tracking**: Records `completionDate` or `achievedDate` for strategies, projects, and actions.
- **Executive Goals Report**: Displays a rolling 18-month lookback of completed items grouped by Executive Goal and Strategic Priority.
- **View-Only Access**: Provides read-only modals for strategy and project details.
- **Notification System**: Real-time notifications for various system events, excluding SME users.
- **Meeting Notes**: Allows creation and management of report-out meeting notes tied to strategies, with rich text and PDF export.
- **Report Out Decks**: Auto-generates presentation-style slide decks from live data, with a slide editor, presentation mode, PowerPoint export, trend tracking, and saved reports functionality.
- **Templates Feature**: Provides a collection of strategic planning and project management templates with Word export, and custom template category management for administrators.
- **Decision Log**: RACI-based governance decision tracking with four escalation tiers (Work Stream Lead, Work Stream, Steering Committee, Executive Committee), decision categories, and RACI assignments (Responsible, Accountable, Consulted, Informed).
- **Workstreams**: ERP program management with workstream × phase matrix. Five entity model (Workstreams, Phases, Tasks, Dependencies, Gate Criteria). Features include: Setup ERP Program seeding (10 default workstreams, 7 phases, program gates), four views (Matrix, Executive, Phase Gate Review, Workstream), RAG status calculation at task/workstream-gate/program-gate levels, Critical Path Method (CPM) computation, milestone-based handoffs (Option B), and gate criteria checklists that block milestone completion. Workstreams are linked to strategies (required strategyId). Accessed via strategy dropdown menu → Workstreams.

## External Dependencies

- `@tanstack/react-query`
- `wouter`
- `react-hook-form`
- `zustand`
- `@radix-ui/*`
- `tailwindcss`
- `class-variance-authority`
- `lucide-react`
- `better-sqlite3`
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
- `pptxgenjs`