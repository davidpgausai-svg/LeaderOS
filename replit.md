# StrategicFlow - Strategic Planning Platform

## Overview

StrategicFlow is a comprehensive strategic planning platform designed for organizational management and execution. The application provides a hierarchical system for managing strategies, projects, and actions. Executives create high-level strategies, and leaders implement specific projects with measurable actions. The platform features role-based views, progress tracking, activity monitoring, and comprehensive reporting capabilities for strategic initiatives.

**Important Terminology Note**: The UI uses user-friendly terminology that differs from database schema names:
- UI "Strategies" = Database "strategies"
- UI "Projects" = Database "tactics"
- UI "Actions" = Database "outcomes"

## User Preferences

Preferred communication style: Simple, everyday language.
Access Control: Removed "Executive vs Leader" role switcher in favor of two-layer settings system: 1) Administrator layer for managing user roles and permissions, 2) User layer for personal preferences. Three-role system: Administrators have full modification power over the app, Executives can edit all strategies and tactics, Leaders can only edit tactics assigned to them. All roles have report writing capability.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript, implementing a modern component-based architecture:

- **Framework**: React 18 with TypeScript for type safety and modern React features
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand for role management, user state, and permission checking
- **UI Components**: Radix UI primitives with custom styling via Tailwind CSS
- **Design System**: shadcn/ui component library for consistent UI patterns
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Data Fetching**: TanStack Query for server state management and caching

### Backend Architecture
The backend follows a REST API design with Express.js:

- **Framework**: Express.js for HTTP server and API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Storage**: Abstracted storage interface with in-memory implementation for development
- **Schema Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error handling middleware

### Data Storage Solutions
The application uses a flexible storage abstraction:

- **ORM**: Drizzle ORM for type-safe database interactions
- **Database**: PostgreSQL as the primary database (configured via Drizzle)
- **Production Storage**: DatabaseStorage implementation using PostgreSQL for persistent data
- **Schema Management**: Drizzle migrations for database schema versioning
- **Data Seeding**: Automatic seeding of initial users, strategies, and tactics on first run

### Authentication and Authorization
Role-based access control system with Replit Auth integration:

- **Authentication**: Replit OpenID Connect for secure user authentication and session management
- **Roles**: Administrator, Executive, and Leader roles with different capabilities
- **Permission System**: Administrators have full modification power; Executives can edit all strategies and tactics; Leaders can only edit tactics assigned to them
- **User Management**: User profiles with role-based permissions managed through Settings
- **Session Management**: Express sessions with PostgreSQL session store and Replit Auth integration
- **Access Controls**: Permission-based UI controls that hide/show functionality based on user role
- **Default Admin**: David Gaus (dpgaus@outlook.com) is set as the default administrator

### Key Data Models
The platform centers around six core entities (note: database schema names differ from UI labels):

1. **Users**: Role-based user accounts (administrators, executives, and leaders)
2. **Strategies** (DB: strategies, UI: "Strategies"): High-level organizational objectives with metrics and timelines
   - Each strategy has a customizable color code for visual identification
   - Color pickers available in both create and edit forms with 8 predefined colors plus custom color option
   - Colors: Emerald (#10B981), Blue (#3B82F6), Purple (#8B5CF6), Amber (#F59E0B), Red (#EF4444), Pink (#EC4899), Cyan (#06B6D4), Teal (#14B8A6)
   - **Change Continuum Framework**: 9 mandatory fields for change management (see dedicated section below)
3. **Tactics** (DB: tactics, UI: "Projects"): Specific actionable items assigned to users under strategies
   - Each project includes 7 milestones for tracking implementation progress
   - Document folder URL field for centralized project documentation
4. **Outcomes** (DB: outcomes, UI: "Actions"): Measurable results and deliverables associated with projects
5. **Milestones**: 7 predefined milestones per project tracking change management phases
6. **Communication Templates**: URL links to presentation and documentation templates for each milestone
7. **Activities**: Audit trail and activity feed for tracking changes and progress

### Progress Calculation System
Automatic backend-driven progress calculation with cascading rollups:

- **Action Progress**: Binary (0% incomplete, 100% complete based on status)
- **Project Progress**: Average of all child actions (empty = 0%)
- **Strategy Progress**: Average of all child projects (empty = 0%)
- **Automatic Recalculation**: Backend recalculates progress after any action/project mutation
- **Excluded from Calculation**: Archived items don't affect parent progress
- **User Interface**: Progress fields removed from create/edit forms - progress is read-only and auto-calculated
- **Data Integrity**: Progress persisted in database and recalculated server-side on every change

### Archiving System
Comprehensive archiving workflow for completed strategies:

- **Two-Step Completion**: Strategies must be marked "Completed" before they can be archived
- **Status Lifecycle**: Active → Completed → Archived
- **Cascading Archival**: When a strategy is archived, all related projects and actions are automatically archived
- **Completion Tracking**: Strategies track completion date for historical reporting
- **Default Filtering**: Archived items are hidden from main views by default
- **Timeline Visibility**: Archived strategies appear on Timeline with muted styling and completion dates
- **Completion Reports**: Strategy Completion report shows on-time vs late completion metrics
- **Performance Indicators**: Reports calculate days offset from target date (positive = late, negative = early/on-time)

### Change Continuum Framework
Every strategy includes 9 mandatory fields that define the change management approach:

1. **Case for Change**: Justification for why the change is necessary
2. **Vision Statement**: Description of the desired future state
3. **Success Metrics**: Measurable indicators of success
4. **Stakeholder Map**: Identification of key stakeholders and their roles
5. **Readiness Rating (RAG)**: Red/Amber/Green assessment of organizational readiness
6. **Risk Exposure Rating**: Assessment of potential risks and mitigation strategies
7. **Change Champion Assignment**: Designation of change leaders and sponsors
8. **Reinforcement Plan**: Strategy for sustaining the change over time
9. **Benefits Realization Plan**: Approach for tracking and realizing expected benefits

**Implementation Details:**
- All 9 fields are mandatory (enforced at database, API, and form levels)
- Database fields use NOT NULL constraints with meaningful defaults ("To be defined")
- API validation requires non-empty strings using `.trim().min(1)` Zod validation
- Fields are displayed in collapsible sections on Strategy cards and detail views
- Full dark mode support across all Change Continuum displays

### Project Milestones System
Each project automatically includes 7 predefined milestones for tracking change implementation:

1. **Stakeholder & Readiness Assessment**: Initial stakeholder analysis and readiness evaluation
2. **Executive Governance Review**: Executive leadership review and approval
3. **Directors Meeting Authorization**: Board or director-level authorization
4. **Strategic Communication Deployment**: Rollout of strategic communications
5. **Staff Meetings & Huddles Activation**: Team engagement and activation sessions
6. **Education & Enablement Completion**: Training and enablement activities
7. **Operational Feedback + Governance Close-Out**: Final review and lessons learned

**Milestone Features:**
- Auto-created when a new project is created
- Each milestone tracks status (not_started, in_progress, completed)
- Displayed as checklist on project cards with visual completion indicators
- Can include start dates, completion dates, and notes
- Integrated with Communication Templates for document management

### Communication Templates
Centralized document management for project milestones:

- **Purpose**: Store and manage URLs to presentation and documentation templates
- **Structure**: One URL per milestone (7 URLs total per project)
- **Features**: 
  - Simple URL input fields for each milestone
  - Clickable hyperlinks to access templates
  - Auto-creation of template placeholders for all projects
  - Project-specific organization by milestone number
- **Access**: Available to all users through dedicated Communication Templates page

### View-Only Access
Strategy and Project cards include View functionality for read-only access:

- **View Buttons**: Available in dropdown menus on all Strategy and Project cards
- **Accessibility**: View access available to all users regardless of edit permissions
- **View Modals**: Display all details in read-only format including:
  - Strategies: All 9 Change Continuum fields, timeline, metrics, status
  - Projects: All project details, 7 milestones with completion status, KPIs, resources
- **Purpose**: Allow users to review details without requiring edit permissions

### Development and Build System
Modern development toolchain:

- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with CSS variables for theming
- **Development**: Hot module replacement and runtime error handling
- **Bundling**: ESBuild for server-side bundling and deployment

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing library for React
- **react-hook-form**: Form handling and validation
- **zustand**: Client-side state management

### UI and Styling
- **@radix-ui/***: Accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **lucide-react**: Icon library

### Backend Services
- **drizzle-orm**: Type-safe ORM for database operations
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **connect-pg-simple**: PostgreSQL session store
- **express**: Web framework for Node.js

### Validation and Type Safety
- **zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle ORM and Zod
- **@hookform/resolvers**: Form validation resolvers

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit-specific development tools