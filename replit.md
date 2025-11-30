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
The application employs Drizzle ORM for type-safe PostgreSQL interactions. Drizzle migrations manage schema versioning with automatic migration on startup.

### Multi-Instance Migration System
The application supports deployment across multiple Replit instances, each with its own database. Key features:
- **Automatic migrations on startup** - `server/migrate.ts` runs Drizzle migrations before the server starts
- **Advisory locking** - PostgreSQL advisory lock (key: 12345) prevents concurrent migration conflicts
- **Migration journal seeding** - `scripts/seed-migration-journal.ts` helps existing instances adopt the migration system
- **Instance operator guide** - `INSTANCE_OPERATOR_GUIDE.md` documents the git pull → restart workflow
- **Schema changes workflow**: Modify `shared/schema.ts` → Run `npx drizzle-kit generate` → Commit migrations → Instances auto-apply on restart

### Authentication and Authorization
A role-based access control system integrates Replit OpenID Connect for authentication. Roles include Administrator, Co-Lead, View, and SME (Subject Matter Expert), with permissions enforced at the API level based on user roles and strategy assignments. SME users are explicitly blocked from logging in as they exist solely for tracking and assignment purposes. Administrators manage user roles and strategy assignments, ensuring data isolation.

### Key Data Models
Core entities include Users, User Strategy Assignments (linking users to strategies), Strategies (high-level objectives with a Change Continuum Framework and customizable colors), Projects (with custom communication URL field and documentation URLs), Actions (with two-tier filtering), Barriers (project-level risk tracking with severity and status lifecycle), Dependencies (relationships between projects and actions), Meeting Notes (report-out notes with dynamic project/action selection and PDF export), and Activities (audit trail). The database tables are: users, user_strategy_assignments, strategies, projects, actions, action_documents, action_checklist_items, barriers, dependencies, meeting_notes, activities, notifications, and sessions.

### Progress Calculation
A backend-driven system automatically calculates progress for actions, projects, and strategies with cascading rollups. Progress is read-only in the UI and recalculated server-side upon data changes, excluding archived items.

### Archiving System
Strategies follow an Active → Completed → Archived lifecycle. Archiving a strategy cascades to its associated projects and actions. Archived items are hidden by default but appear on the Timeline with completion metrics.

### Change Continuum Framework
Each strategy incorporates 9 mandatory fields for change management: Case for Change, Vision Statement, Success Metrics, Stakeholder Map, Readiness Rating, Risk Exposure Rating, Change Champion Assignment, Reinforcement Plan, and Benefits Realization Plan. These fields are enforced for completion and displayed in collapsible sections with full dark mode support. AI generation includes data sanitization to ensure all fields are converted to readable strings (handles objects/arrays properly) to prevent "[object Object]" display errors.

### Project Communication URLs
Each project includes an optional custom communication URL field that can be managed via the project's three-dot menu. This allows linking to communication materials, templates, or documentation specific to each project.

### Barriers System
A comprehensive risk and obstacle tracking system at the project level. Each barrier tracks description, severity (High, Medium, Low), status lifecycle (Active → Mitigated → Resolved → Closed), owner assignment, creation/resolution dates, and resolution notes. Barriers are managed via a dedicated modal accessible from project cards (three-dot menu). Project cards display up to 2 active barriers with severity indicators and status badges, showing "+X more" for overflow. All barrier operations (create, status updates, delete) are logged to the activity audit trail. Role-based access control enforces permissions: Administrators and Co-Leads can manage barriers; View users see barriers read-only; SME users are excluded. The AI Chat Assistant integrates barriers data to provide executive-level insights on risks and obstacles. API supports both project-scoped and global barrier queries with role-based filtering (administrators see all, others see only barriers in assigned strategies).

### Dependencies System
A feature for tracking and visualizing relationships between projects and actions across strategies. Dependencies can represent "blocks" or "depends_on" relationships. Key features include:
- **DependencyTags component**: Displays on project and action cards, showing dependencies the item has and dependencies that point to it. Administrators and Co-Leads can add/remove dependencies.
- **Dependency creation**: Users select a target type (project or action), then choose from available items within their assigned strategies.
- **Graph page**: A dedicated visualization page (`/graph`) showing three columns (Strategies, Projects, Actions) with:
  - Dashed lines for hierarchy relationships (strategy→project, project→action)
  - Solid colored lines for explicit dependencies between items
  - Hover highlighting to emphasize related connections
  - Strategy filtering and pan/zoom controls for large plans
- **Activity logging**: Dependency creation and deletion events are recorded in the activity audit trail.
- **Role-based access**: Administrators and Co-Leads can manage dependencies; View users see dependencies read-only; SME users are excluded.

### View-Only Access
All Strategy and Project cards offer view-only access via dedicated buttons, displaying comprehensive details in read-only modals for all users, regardless of edit permissions.

### Notification System
A real-time notification system alerts users to action completions, project progress, strategy status changes, and due date warnings/overdue alerts. Notifications appear in a dedicated panel with an unread count, read/unread toggling, and deletion options. A background job handles due date alerts. SME users are excluded from all notifications as they cannot log in to the system.

### Meeting Notes (Report-Out Meetings)
A comprehensive system for creating and managing report-out meeting notes with dynamic content selection. Users can create notes tied to a specific strategy, then dynamically select which projects and actions to include (not all). Features include: hierarchical cascading selectors (Strategy → Projects → Actions), rich text notes field, meeting date tracking, PDF export for email distribution, and proper authorization (users can only create notes for assigned strategies and must be the creator or an administrator to edit/delete). Notes are stored in the database with selected projects and actions as JSON arrays. Accessible via the "Meeting Notes" link in the sidebar.

### AI Chat Assistant
A floating chat assistant named "Strategic AI Assistant" accessible from all pages via a button in the bottom-right corner. Provides contextual help including navigation guidance, real-time status updates with live data from strategies/projects/actions, and copy writing assistance. The assistant has access to the user's assigned strategies, projects, and action counts with progress percentages, enabling data-driven responses. Chat history is persisted per user in the database. Supports two AI providers: OpenAI (GPT-4o via Replit AI Integrations, billed to credits) and Google Gemini (user's own free API key). Provider selection is controlled via the CHAT_AI_PROVIDER environment variable ('openai' or 'gemini'). Currently configured to use Gemini for cost-free operation within Google's free tier limits (15 requests/min, 1,500/day).

### Templates Feature
A collection of strategic planning, project management, and productivity templates accessible to all logged-in users via the sidebar. Features include:
- **Main Templates Page** (`/templates`): Card grid displaying available templates with category filtering (Strategic Planning, Project Management, Daily Tasks, plus custom categories).
- **Built-in Templates**:
  - Strategy on a Page (`/templates/strategy-on-a-page`): Comprehensive enterprise framework with Mission, Vision, Strategic Priorities (3-5), Objectives with KPIs, Key Initiatives linked to priorities, and Risks & Mitigations with impact/likelihood assessment
  - PESTLE Analysis (`/templates/pestle`): External macro-environment scanning framework evaluating Political, Economic, Social, Technological, Legal, and Environmental factors with trend direction, likelihood/impact scoring, strategic implications, and response status tracking
  - Porter's Five Forces (`/templates/porters-five-forces`): Competitive industry analysis framework assessing Threat of New Entrants, Supplier Power, Buyer Power, Threat of Substitutes, and Competitive Rivalry with dimension-level scoring, diagnostic prompts, and strategic response planning
  - SWOT Analysis (`/templates/swot`): 2x2 grid for Strengths, Weaknesses, Opportunities, and Threats analysis
  - SMART Goals (`/templates/smart-goals`): Structured framework for Specific, Measurable, Achievable, Relevant, and Time-bound goal setting
  - Eisenhower Matrix (`/templates/eisenhower-matrix`): 4-quadrant task prioritization (Do First, Schedule, Delegate, Delete)
- **Export Functionality**: All templates support Word document export using the `docx` library.
- **Administrator Template Types**: Custom template categories can be managed by administrators in Settings > Administrator Settings > Data Management. Categories are stored in the `template_types` database table.

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
- `jspdf` - PDF generation for templates
- `html2canvas` - HTML to canvas conversion for PDF export
- `docx` - Word document generation for templates

### AI Services
- `openai` - GPT-4o via Replit AI Integrations for Change Continuum generation and optional chat
- `@google/generative-ai` - Gemini 2.0 Flash for cost-free chat assistant (user's API key)