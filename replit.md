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
SQLite with `better-sqlite3` is used for lightweight, file-based data storage, with automatic table creation on startup.

### Deployment
The application supports Docker and DigitalOcean App Platform deployment, utilizing environment variables for configuration (`JWT_SECRET`, `INITIAL_REGISTRATION_TOKEN`, `DATA_DIR`, `NODE_ENV`).

### Multi-Tenancy Architecture
The platform supports multiple organizations with complete data isolation on a single database. All data is scoped by `organization_id`, and a Super Admin role can manage all organizations. Each organization has a unique registration token.

### Authentication and Authorization
A role-based access control system uses JWT email/password authentication. Permissions are enforced at the API level based on user roles (Administrator, Co-Lead, View, SME), strategy assignments, and organization membership. SME users cannot log in.

### Secure Registration System
Registration requires an organization-specific secret token in the URL (`/register/:token`). Administrators can manage tokens, and the first registrant for an organization becomes an Administrator. Super Admins can be designated via the `SUPER_ADMIN_EMAILS` environment variable.

### Key Data Models
Core entities include Organizations (for multi-tenancy), Users (with organization membership and optional super_admin status), User Strategy Assignments, Strategies (with Change Continuum Framework), Projects (with communication URL), Actions, Barriers, Dependencies, Meeting Notes, Activities, AI Chat Conversations, and Template Types. All tables include organization_id for data isolation.

### Progress Calculation
Backend-driven progress calculation for actions, projects, and strategies, with cascading rollups and read-only display in the UI.

### Archiving System
Strategies follow an Active → Completed → Archived lifecycle, with cascading archiving to projects and actions. Archived items are hidden by default but tracked.

### Change Continuum Framework
Strategies incorporate 9 mandatory change management fields (e.g., Case for Change, Vision Statement), enforced for completion and supporting AI generation with data sanitization.

### Barriers System
A project-level risk tracking system for barriers, including description, severity, status lifecycle, owner, and resolution notes. Barriers are visible on project cards and are integrated with the AI Chat Assistant for insights.

### Dependencies System
Tracks and visualizes relationships between projects and actions across strategies, representing "blocks" or "depends_on." Features include DependencyTags, a dedicated graph visualization page, and activity logging.

### View-Only Access
Strategy and Project cards offer view-only access via dedicated buttons, displaying comprehensive details in read-only modals for all users.

### Notification System
A real-time notification system for action completions, project progress, strategy status changes, and due date alerts. SME users are excluded.

### Meeting Notes (Report-Out Meetings)
Allows creation and management of report-out meeting notes tied to strategies, with dynamic selection of projects and actions, rich text fields, PDF export, and authorization controls.

### AI Chat Assistant
A floating "Strategic AI Assistant" provides contextual help, real-time status updates with live data, and copy writing assistance. It has access to user-assigned strategies and persists chat history. Supports OpenAI (GPT-4o) and Google Gemini (Gemini 2.0 Flash) based on environment variable configuration.

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
- `better-sqlite3`
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