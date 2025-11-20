# StrategicFlow - Strategic Planning Platform

## Overview

StrategicFlow is a comprehensive strategic planning platform designed for organizational management and execution. It provides a hierarchical system for managing strategies, projects, and actions, enabling executives to define high-level strategies and leaders to implement specific projects with measurable actions. The platform features role-based views, progress tracking, activity monitoring, and comprehensive reporting for strategic initiatives, with a business vision to streamline strategic planning and execution across organizations.

## User Preferences

Preferred communication style: Simple, everyday language.
Access Control: Two-layer settings system: 1) Administrator layer for managing user roles, permissions, and strategy assignments, 2) User layer for personal preferences. Three-role system with strategy-based access: Administrators have full modification power over the app and see all strategies; Co-Leads can edit projects and actions for assigned strategies only; View users have read-only access to assigned strategies. All roles have report writing capability. Strategy assignments are managed by administrators through the Settings page.

## System Architecture

### Frontend
The frontend uses React 18 with TypeScript, Wouter for routing, Zustand for state management, and Radix UI with Tailwind CSS for styling, complemented by shadcn/ui. Forms are handled with React Hook Form and Zod validation, and data fetching uses TanStack Query.

### Backend
The backend is a REST API built with Express.js and TypeScript. It utilizes an abstracted storage interface, Zod for schema validation, and centralized error handling.

### Data Storage
The application employs Drizzle ORM for type-safe PostgreSQL interactions. Drizzle migrations manage schema versioning, and initial data seeding occurs on the first run.

### Authentication and Authorization
A role-based access control system integrates Replit OpenID Connect for authentication. Roles include Administrator, Co-Lead, and View, with permissions enforced at the API level based on user roles and strategy assignments. Administrators manage user roles and strategy assignments, ensuring data isolation.

### Key Data Models
Core entities include Users, User Strategy Assignments (linking users to strategies), Strategies (high-level objectives with a Change Continuum Framework and customizable colors), Tactics (Projects with 7 milestones and documentation URLs), Outcomes (Actions with two-tier filtering), Milestones, Communication Templates, and Activities (audit trail).

### Progress Calculation
A backend-driven system automatically calculates progress for actions, projects, and strategies with cascading rollups. Progress is read-only in the UI and recalculated server-side upon data changes, excluding archived items.

### Archiving System
Strategies follow an Active → Completed → Archived lifecycle. Archiving a strategy cascades to its associated projects and actions. Archived items are hidden by default but appear on the Timeline with completion metrics.

### Change Continuum Framework
Each strategy incorporates 9 mandatory fields for change management: Case for Change, Vision Statement, Success Metrics, Stakeholder Map, Readiness Rating, Risk Exposure Rating, Change Champion Assignment, Reinforcement Plan, and Benefits Realization Plan. These fields are enforced for completion and displayed in collapsible sections with full dark mode support.

### Project Milestones
Every project includes 7 predefined milestones for change implementation (e.g., Stakeholder & Readiness Assessment, Executive Governance Review). These milestones track status, include start/completion dates and notes, and integrate with Communication Templates.

### Communication Templates
A centralized system for managing URLs to presentation and documentation templates, with one URL per milestone per project.

### View-Only Access
All Strategy and Project cards offer view-only access via dedicated buttons, displaying comprehensive details in read-only modals for all users, regardless of edit permissions.

### Notification System
A real-time notification system alerts users to action completions, project progress, strategy status changes, and due date warnings/overdue alerts. Notifications appear in a dedicated panel with an unread count, read/unread toggling, and deletion options. A background job handles due date alerts.

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