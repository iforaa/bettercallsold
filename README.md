# BetterCallSold - E-commerce Admin Platform

**Shopify-inspired admin panel with CommentSold integration and React Native mobile app**

BetterCallSold is a sophisticated e-commerce management platform that provides a professional Shopify-like admin interface with seamless CommentSold API integration, live streaming capabilities, and a full-featured mobile application.

## 🚀 Quick Start

### Environment Setup
Create a `.env` file in the project root:

```bash
# Database Connection (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# CommentSold API Configuration
COMMENTSOLD_BASE_URL=https://api.commentsold.com/api/2.0/divas

# Application Settings
DEFAULT_TENANT_ID=your-tenant-uuid-here

# Development Settings
NODE_ENV=development
```

### Development Server
```bash
npm install
npm run dev
# Navigate to http://localhost:5173
```

### Database Connection
Verify your Neon PostgreSQL connection:
```bash
psql $DATABASE_URL
\dt  # List tables to confirm connection
```

### Mobile App Setup
The React Native/Expo mobile app is located in the `mobile-app/` directory:
```bash
cd mobile-app
npm install
npx expo start
```

## 🏗️ Tech Stack

### Frontend
- **SvelteKit 5** with TypeScript and Services + Runes + Context architecture
- **Custom CSS Design System** (Shopify-exact colors, no frameworks)
- **Reactive State Management** using Svelte 5 runes (`$state`, `$derived`, `$effect`)

### Backend & Database
- **Node.js** with SvelteKit server-side functions
- **Neon PostgreSQL** (serverless) with multi-tenant architecture
- **JSONB storage** for complex data (product variants, images, metadata)
- **UUID primary keys** with `uuid_generate_v4()`

### Mobile & Integration
- **React Native/Expo** mobile application
- **CommentSold API** integration with server-side proxy endpoints
- **Live streaming** with Agora SDK integration
- **Real-time features** with Pusher for chat and updates

## 🎯 Key Features

### Admin Panel
- **Dashboard** with metrics, recent orders, and system health
- **Order Management** with status tracking and customer details
- **Product Management** with variants, collections, and inventory
- **Customer Management** with order history and communication
- **Live Streaming** with Agora integration for live selling
- **Waitlist Management** with customer authorization and bulk operations

### Mobile Application
- **Product Catalog** with search, filtering, and collections
- **Cart & Checkout** with seamless cart/waitlist switching
- **Live Sales** with real-time video streaming and chat
- **Favorites & Waitlists** with preauthorization support
- **User Account** management and order history

### Developer Experience
- **Comprehensive API** with 60+ endpoints
- **Interactive Testing** via `/test-cs-api` page
- **Database Migrations** and health monitoring
- **Type Safety** with comprehensive TypeScript interfaces

## 🛠️ Essential Development Tools

### cURL for API Testing ⚠️ **REQUIRED**
Always test API endpoints with cURL before UI development:

```bash
# Test admin endpoints
curl -X GET "http://localhost:5173/api/orders?limit=10"
curl -X GET "http://localhost:5173/api/products"

# Test mobile endpoints
curl -X GET "http://localhost:5173/api/mobile/products/find?limit=20"
curl -X POST "http://localhost:5173/api/mobile/cart/add" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "123", "inventory_id": 456}'
```

### psql for Database Inspection ⚠️ **REQUIRED**
Direct database access is essential for development:

```bash
# Connect to database
psql $DATABASE_URL

# Essential commands
\dt                           # List all tables
\d orders                     # Describe orders table structure
SELECT * FROM products LIMIT 5;  # View sample data
\q                           # Exit
```

**Both cURL and psql are encouraged and necessary tools for effective development.**

## 📁 Project Structure

```
src/
├── lib/
│   ├── services/           # Stateless business logic (18+ services)
│   ├── state/              # Global reactive state (.svelte.js files)
│   ├── contexts/           # Component-tree state management
│   ├── components/         # Reusable UI components (domain-organized)
│   ├── types/              # TypeScript interfaces (100+ types)
│   └── utils/              # Helper functions and utilities
├── routes/
│   ├── api/                # Server-side API endpoints (60+)
│   │   ├── mobile/         # Mobile API with CommentSold compatibility
│   │   ├── cs-sync/        # CommentSold synchronization endpoints
│   │   └── [domain]/       # Domain-specific endpoints
│   └── [pages]/            # Admin interface pages
├── styles/
│   ├── tokens.css          # Design system tokens
│   ├── components/         # Component-specific styles
│   └── layouts/            # Layout styles
└── mobile-app/             # React Native/Expo mobile application
```

## 🎨 Design System

BetterCallSold uses a **custom CSS design system** inspired by Shopify's admin interface:

### Colors (Shopify-exact)
- **Primary Green**: `#00a96e` (success states, primary actions)
- **Primary Blue**: `#005bd3` (links, focus states)
- **Header Dark**: `#1a1a1a` (navigation header)
- **Background**: `#f6f6f7` (sidebar and backgrounds)

### Typography
- **Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Consistent sizing**: CSS custom properties for all font sizes and weights

### Component Classes
- **Buttons**: `.btn-primary`, `.btn-secondary`, `.btn-accent`
- **Cards**: `.metric-card`, `.status-card`, `.info-card`
- **Status**: `.status-badge`, `.status-pending`, `.status-completed`
- **Tables**: `.data-table`, `.table-header`, `.table-row`

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Production build
npm run preview          # Preview production build

# Type Checking
npm run check            # TypeScript and Svelte check
npm run check:watch      # Watch mode type checking

# Mobile Development
cd mobile-app
npx expo start           # Start Expo development server
npx expo build           # Build mobile app
```

## 🏛️ Architecture Overview

### Services + Runes + Context Pattern
1. **Services Layer**: Stateless business logic for API calls and data transformations
2. **Global State**: Reactive state with Svelte 5 runes for app-wide data
3. **Context APIs**: Component-tree scoped state for UI interactions
4. **Components**: Reusable UI that consumes reactive state

### Multi-Tenant Database
- All tables include `tenant_id` for data isolation
- PostgreSQL with JSONB for complex product data
- UUID primary keys for security and scalability
- Connection pooling for serverless efficiency

### Mobile API Integration
- CommentSold-compatible endpoints at `/api/mobile/`
- Seamless cart/waitlist management
- Real-time synchronization with admin panel
- Complete mobile app documentation at `/api/mobile/README.md`

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete technical reference
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development patterns and debugging
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant instructions
- **Mobile API** - `/api/mobile/README.md` for complete mobile endpoint documentation

## 🚨 Critical Development Notes

### Svelte 5 Patterns
- **Never destructure runes**: Use `state.loading` instead of `const { loading } = state`
- **Access properties directly**: Maintains reactivity across the application
- **Use $effect carefully**: Add dependency checks to prevent infinite loops

### Testing Workflow
1. **cURL first**: Test all API endpoints before building UI
2. **Database inspection**: Use psql to verify schema and data
3. **Interactive testing**: Use `/test-cs-api` for comprehensive endpoint testing
4. **Component testing**: Build and test UI components last

### Error Handling
- Comprehensive error boundaries in all services
- Graceful degradation for missing API endpoints
- User-friendly error messages with retry functionality
- Detailed logging for debugging and monitoring

## 🤝 Contributing

1. **Read the architecture**: Start with `ARCHITECTURE.md` for technical details
2. **Follow patterns**: Use established Services + Runes + Context architecture
3. **Test thoroughly**: Always test with cURL and psql before UI development
4. **Maintain design system**: Use existing CSS classes and design tokens
5. **Update documentation**: Keep architecture docs current with changes

---

**BetterCallSold** - Professional e-commerce management with modern web technologies and mobile-first approach.