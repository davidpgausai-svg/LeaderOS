# StrategicFlow - Strategic Planning Platform

## Overview

StrategicFlow is a comprehensive strategic planning platform designed for organizational management and execution. It provides a hierarchical system for managing strategies, projects, and actions, enabling executives to define high-level strategies and leaders to implement specific projects with measurable actions. The platform features role-based views, progress tracking, activity monitoring, and comprehensive reporting for strategic initiatives, with a business vision to streamline strategic planning and execution across organizations.

## User Preferences

Preferred communication style: Simple, everyday language.
Access Control: Two-layer settings system: 1) Administrator layer for managing user roles, permissions, and strategy assignments, 2) User layer for personal preferences. Four-role system with strategy-based access: Administrators have full modification power over the app and see all strategies; Co-Leads can edit projects and actions for assigned strategies only; View users have read-only access to assigned strategies; SME (Subject Matter Expert) users are for tracking only and cannot log in to the system. Administrators, Co-Leads, and View users have report writing capability. Strategy assignments are managed by administrators through the Settings page.

## System Architecture

### Frontend
The frontend uses React 18 with TypeScript, Wouter for routing, Zustand for state management, and Radix UI with Tailwind CSS for styling, complemented by shadcn/ui. Forms are handled with React Hook Form and Zod validation, and data fetching uses TanStack Query.

### Backend
The backend is a REST API built with Express.js and TypeScript. It utilizes an abstracted storage interface, Zod for schema validation, and centralized error handling.

### Data Storage
The application employs Drizzle ORM for type-safe PostgreSQL interactions. Drizzle migrations manage schema versioning, and initial data seeding occurs on the first run.

### Authentication and Authorization
A role-based access control system integrates Replit OpenID Connect for authentication. Roles include Administrator, Co-Lead, View, and SME (Subject Matter Expert), with permissions enforced at the API level based on user roles and strategy assignments. SME users are explicitly blocked from logging in as they exist solely for tracking and assignment purposes. Administrators manage user roles and strategy assignments, ensuring data isolation.

### Key Data Models
Core entities include Users, User Strategy Assignments (linking users to strategies), Strategies (high-level objectives with a Change Continuum Framework and customizable colors), Projects (with custom communication URL field and documentation URLs), Actions (with two-tier filtering), Meeting Notes (report-out notes with dynamic project/action selection and PDF export), and Activities (audit trail). The database tables are: users, user_strategy_assignments, strategies, projects, actions, action_documents, action_checklist_items, meeting_notes, activities, notifications, and sessions.

### Progress Calculation
A backend-driven system automatically calculates progress for actions, projects, and strategies with cascading rollups. Progress is read-only in the UI and recalculated server-side upon data changes, excluding archived items.

### Archiving System
Strategies follow an Active → Completed → Archived lifecycle. Archiving a strategy cascades to its associated projects and actions. Archived items are hidden by default but appear on the Timeline with completion metrics.

### Change Continuum Framework
Each strategy incorporates 9 mandatory fields for change management: Case for Change, Vision Statement, Success Metrics, Stakeholder Map, Readiness Rating, Risk Exposure Rating, Change Champion Assignment, Reinforcement Plan, and Benefits Realization Plan. These fields are enforced for completion and displayed in collapsible sections with full dark mode support. AI generation includes data sanitization to ensure all fields are converted to readable strings (handles objects/arrays properly) to prevent "[object Object]" display errors.

### Project Communication URLs
Each project includes an optional custom communication URL field that can be managed via the project's three-dot menu. This allows linking to communication materials, templates, or documentation specific to each project.

### View-Only Access
All Strategy and Project cards offer view-only access via dedicated buttons, displaying comprehensive details in read-only modals for all users, regardless of edit permissions.

### Notification System
A real-time notification system alerts users to action completions, project progress, strategy status changes, and due date warnings/overdue alerts. Notifications appear in a dedicated panel with an unread count, read/unread toggling, and deletion options. A background job handles due date alerts. SME users are excluded from all notifications as they cannot log in to the system.

### Meeting Notes (Report-Out Meetings)
A comprehensive system for creating and managing report-out meeting notes with dynamic content selection. Users can create notes tied to a specific strategy, then dynamically select which projects and actions to include (not all). Features include: hierarchical cascading selectors (Strategy → Projects → Actions), rich text notes field, meeting date tracking, PDF export for email distribution, and proper authorization (users can only create notes for assigned strategies and must be the creator or an administrator to edit/delete). Notes are stored in the database with selected projects and actions as JSON arrays. Accessible via the "Meeting Notes" link in the sidebar.

### Development Environment
The project uses Vite for fast development and optimized builds, Tailwind CSS for styling, and TypeScript for static type checking.

## External Dependencies

### Core Frameworks
- `@tanstack/react-query`
- `wouter`
- `react-hook-form`
- `zustand`

### UI and Styling
- `@radix-ui/*`
- `tailwindcss`
- `class-variance-authority`
- `lucide-react`

### Backend Services
- `drizzle-orm`
- `@neondatabase/serverless`
- `connect-pg-simple`
- `express`

### Validation and Type Safety
- `zod`
- `drizzle-zod`
- `@hookform/resolvers`

### Development Tools
- `vite`
- `typescript`

### Document Generation
- `react-to-print` - PDF export functionality for meeting notes