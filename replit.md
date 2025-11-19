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
The platform centers around four core entities (note: database schema names differ from UI labels):

1. **Users**: Role-based user accounts (administrators, executives, and leaders)
2. **Strategies** (DB: strategies, UI: "Strategies"): High-level organizational objectives with metrics and timelines
   - Each strategy has a customizable color code for visual identification
   - Color pickers available in both create and edit forms with 8 predefined colors plus custom color option
   - Colors: Emerald (#10B981), Blue (#3B82F6), Purple (#8B5CF6), Amber (#F59E0B), Red (#EF4444), Pink (#EC4899), Cyan (#06B6D4), Teal (#14B8A6)
3. **Tactics** (DB: tactics, UI: "Projects"): Specific actionable items assigned to users under strategies
4. **Outcomes** (DB: outcomes, UI: "Actions"): Measurable results and deliverables associated with projects
5. **Activities**: Audit trail and activity feed for tracking changes and progress

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