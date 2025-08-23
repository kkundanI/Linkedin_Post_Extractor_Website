# LinkedIn Post Extractor

## Overview

This is a full-stack web application that extracts content from LinkedIn posts, including text, images, videos, and documents. The application features a modern React frontend with shadcn/ui components and an Express backend. It provides both demo mode functionality and real LinkedIn URL processing capabilities, with features for content preview, selective downloading, and bulk ZIP export.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/bundling
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and dark mode support
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with structured error handling
- **Request Validation**: Zod schemas for type-safe request/response validation
- **Development**: Hot reload with Vite integration and custom logging middleware

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Centralized schema definitions in shared directory
- **Migration System**: Drizzle Kit for database migrations
- **Session Storage**: PostgreSQL-based session store with connect-pg-simple

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL backing store
- **User Storage**: In-memory storage implementation with interface for future database integration
- **Security**: CORS configuration and request validation middleware

### External Dependencies
- **Database**: Neon Database (PostgreSQL-compatible serverless database)
- **UI Components**: Radix UI for accessible component primitives
- **File Processing**: JSZip for creating downloadable ZIP archives
- **Image Handling**: Unsplash API for demo mode placeholder images
- **Development Tools**: ESBuild for production builds, TSX for development server
- **Styling**: Inter font family from Google Fonts
- **Icons**: Lucide React for consistent iconography

### Key Features
- **Content Extraction**: Processes LinkedIn URLs to extract text, media, and documents
- **Demo Mode**: Provides sample content for testing without real LinkedIn integration
- **Media Preview**: Modal-based preview system for images, videos, and documents
- **Selective Download**: Checkbox-based selection for downloading specific content items
- **Bulk Export**: ZIP file generation with organized folder structure
- **Responsive Design**: Mobile-first responsive layout with dark mode support
- **Error Handling**: Comprehensive error boundaries and user feedback systems
- **Accessibility**: ARIA-compliant components and keyboard navigation support