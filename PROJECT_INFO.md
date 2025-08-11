# BetterCallSold - Project Documentation

## 📋 Project Overview
**BetterCallSold** is a SvelteKit-based e-commerce admin panel inspired by Shopify's design. The application integrates with CommentSold API to sync products and manage inventory, customers, and orders.

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: SvelteKit 5 with TypeScript
- **Styling**: Custom CSS design system (NO Tailwind CSS)
- **State Management**: Svelte 5 runes (`$state`, `$derived`, `$effect`) with Services + Global State + Context pattern
- **Routing**: SvelteKit file-based routing
- **UI Design**: Shopify-inspired admin interface

#### **Svelte 5 Development Rules**
⚠️ **CRITICAL**: Follow these patterns to avoid breaking reactivity:

1. **Never destructure reactive state**: `const { loading } = state` ❌ breaks reactivity
2. **Access state properties directly**: `state.loading` ✅ maintains reactivity  
3. **Cannot export $derived from modules**: Export functions instead
4. **$derived must be top-level declarations**: Cannot be used in object properties

### CSS Architecture
**IMPORTANT**: This project uses a **custom CSS design system**, NOT Tailwind CSS.

- **Design Tokens**: CSS custom properties for consistent colors, spacing, typography
- **Component Classes**: Semantic class names (`.btn-primary`, `.status-badge`, `.metric-card`)
- **Scoped Styles**: Component-level CSS with Svelte's scoped styling
- **Global Styles**: Shared design tokens and base styles in layout files
- **No CSS Frameworks**: Pure CSS approach for maximum control and performance

**Do NOT install**: `tailwind-merge`, `clsx`, or any Tailwind-related utilities - they are unnecessary and conflict with the design system approach.

### Backend/API
- **Runtime**: Node.js with SvelteKit server-side functions
- **Database**: Neon PostgreSQL (serverless)
- **External API**: CommentSold API integration
- **Authentication**: Multi-tenant system with `tenant_id`

### Database (Neon PostgreSQL)
- **Provider**: Neon (serverless PostgreSQL)
- **Type**: PostgreSQL with serverless scaling
- **Connection**: Custom database connection pool in `/src/lib/database.js`
- **Architecture**: Multi-tenant with `tenant_id` field
- **Primary Keys**: Uses `uuid_generate_v4()` for all tables
- **Complex Data**: JSONB storage for variants, images, etc.

#### Database Access
- **Credentials**: Stored in `.env` file (see Environment Variables section)
- **Direct Access**: Use `psql` to connect directly to Neon for schema inspection
- **Schema Discovery**: Connect with psql to explore current table structure and content
- **Connection**: Neon provides serverless PostgreSQL with automatic scaling and connection pooling

**Note**: The database schema may evolve as the project grows. Use direct database connection to get current structure rather than relying on documentation.

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── commentsold-api.js     # CommentSold API client library
│   │   ├── database.js            # PostgreSQL connection & queries
│   │   ├── response.js            # Standardized API responses
│   │   └── constants.js           # App constants (DEFAULT_TENANT_ID)
│   ├── routes/
│   │   ├── +layout.svelte         # Main app layout (header, sidebar)
│   │   ├── +page.svelte           # Home page
│   │   ├── api/
│   │   │   ├── cs-sync/           # CommentSold sync endpoints
│   │   │   └── test-cs/           # API testing endpoints
│   │   ├── cs-sync/               # CommentSold sync UI
│   │   ├── test-cs-api/           # API testing interface
│   │   ├── products/              # Product management
│   │   ├── customers/             # Customer management
│   │   └── orders/                # Order management
│   └── app.html                   # HTML template
```

## 🎨 Design System

### Colors (Shopify-inspired)
- **Primary Green**: `#00a96e` (logo, accents)
- **Primary Blue**: `#005bd3` (links, focus states)
- **Header**: `#1a1a1a` (dark header background)
- **Sidebar**: `#f6f6f7` (light gray background)
- **Active States**: White background (`#ffffff`) with dark text
- **Text Colors**: `#202223` (primary), `#6d7175` (secondary), `#8c9196` (muted)
- **Borders**: `#e3e3e3`, `#c9cccf`

### Typography
- **Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Sizes**: 13px (nav), 12px (sub-nav), 14px (buttons), 16px (logo)
- **Weights**: 400 (default), 500 (medium), 600 (semibold)

### Layout
- **Header Height**: 48px
- **Sidebar Width**: 232px
- **Border Radius**: 8px (cards), 6px (buttons/inputs), 4px (small elements)
- **Spacing**: 8px base unit, 16px content padding
- **Shadows**: `0 1px 3px rgba(0, 0, 0, 0.1)` for elevation

## 🔧 Key Features

### CommentSold Integration
- **API Client**: `/src/lib/commentsold-api.js`
- **Base URL**: `https://api.commentsold.com/api/2.0/divas`
- **Endpoints**: Products, Collections, Product Details
- **Sync Functionality**: Import products with images, variants, inventory
- **Error Handling**: Comprehensive logging and error reporting

### Navigation System
- **Layout**: Fixed header + sidebar with responsive design
- **Active States**: White backgrounds with subtle shadows
- **Submenu Arrows**: Expandable menus with curved connecting lines
- **Icon Treatment**: Grayscale filter for consistency

### Reactive State Management
- **Pattern**: Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Client-side**: Component state with reactive updates
- **Server-side**: Direct database queries in API routes

## 🗄️ Database Schema

### Schema Discovery
**Important**: The database schema evolves as the project grows. For current schema:

```bash
# Connect directly to Neon database
psql $DATABASE_URL

# List all tables
\dt

# Describe table structure
\d table_name

# View table contents
SELECT * FROM table_name LIMIT 10;
```

### Example Tables (as of initial development)
The project includes tables for products, customers, orders, etc. Use the direct database connection above to explore the current structure.

### Key Patterns
- **Multi-tenant**: All tables include `tenant_id` field
- **JSON Storage**: Complex data (images, variants) stored as JSONB
- **UUID Keys**: All primary keys use PostgreSQL's `uuid_generate_v4()`
- **Timestamp Tracking**: `created_at` and `updated_at` fields for audit trails

## 🔄 CommentSold API Integration

### Authentication
- **Type**: API-based (no auth tokens currently implemented)
- **Endpoints**: Public CommentSold API endpoints

### Data Flow
1. **Fetch Collections**: Get available product collections
2. **Sync Products**: Import products from selected collections
3. **Transform Data**: Convert CommentSold format to internal schema
4. **Database Storage**: Insert/update products with variants and images

### Error Handling
- **Network Errors**: CORS proxy via server-side endpoints
- **Data Validation**: Comprehensive error logging
- **Duplicate Detection**: Check by product name (not external ID)

## 🧪 Testing Infrastructure

### Test Pages
- **API Testing**: `/test-cs-api` - Comprehensive CommentSold API testing
- **Connectivity**: Server-side proxy endpoints for CORS handling
- **Logging**: Real-time logs with expandable JSON data
- **Error Reporting**: Detailed error messages and stack traces

## 🎯 Design Decisions

### Why SvelteKit 5?
- **Modern Reactivity**: New runes system for better performance
- **File-based Routing**: Intuitive project structure
- **Full-stack**: Server-side rendering + API routes in one framework

### Why PostgreSQL?
- **JSON Support**: JSONB for complex product data (variants, images)
- **UUID Support**: Built-in `uuid_generate_v4()` function
- **Scalability**: Handles multi-tenant architecture well

### Why Shopify-inspired Design?
- **Familiarity**: Users expect e-commerce admin to look like Shopify
- **Proven UX**: Shopify's design patterns are well-tested
- **Professional**: Clean, modern interface builds trust

### State Management Patterns
- **Server State**: Direct database queries in API routes
- **Client State**: Svelte 5 runes for reactive UI updates
- **Error State**: Comprehensive error handling with user feedback
- **Loading State**: Visual feedback for all async operations

## 🐛 Known Issues & Solutions

### Fixed Issues
1. **Duplicate Key Error**: Using incrementing counter instead of `Date.now()` for unique IDs
2. **CORS Issues**: Server-side proxy endpoints for external API calls
3. **Database Schema**: Removed non-existent `external_id` column references
4. **SSR Issues**: Wrapped client-side code in `onMount()` and DOM checks

### Performance Considerations
- **Image Loading**: Lazy loading for product images
- **API Pagination**: Limited product sync batches
- **Database Queries**: Efficient queries with proper indexing
- **Bundle Size**: Component-based CSS to reduce unused styles

## 🔮 Future Enhancements

### Planned Features
- **User Authentication**: Implement proper auth system
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Filtering**: Enhanced product search and filtering
- **Bulk Operations**: Mass product updates and imports
- **Analytics Dashboard**: Sales and inventory analytics

### Technical Debt
- **Error Boundaries**: Implement proper error boundaries
- **Type Safety**: Improve TypeScript coverage
- **Testing**: Add unit and integration tests
- **Documentation**: API documentation generation

## 📞 Development Notes

### Environment Variables
Create a `.env` file in the project root with the following variables:

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

**Note**: The specific environment variables may change as the project grows. Check `/src/lib/constants.js` and other config files for current variable usage.

### Getting Started
1. **Install Dependencies**: `npm install`
2. **Environment Setup**: Create `.env` file with required variables (see above)
3. **Database Connection**: Verify Neon PostgreSQL connection works
4. **Development**: `npm run dev`

### Common Commands
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Type Check**: `npm run check`

### Development Tools & Testing

#### API Testing with cURL (MANDATORY)
**⚠️ IMPORTANT**: Before making any changes to API endpoints, always test with cURL first to understand the expected behavior.

The project integrates with various APIs (CommentSold, internal endpoints, etc.). Use cURL to test all endpoints before implementation. Here are example patterns:

##### External API Testing Example
```bash
# Test external API endpoint
curl -X GET "https://api.example.com/endpoint" \
  -H "Accept: application/json" \
  -H "User-Agent: BetterCallSold/1.0"
```

##### Local API Testing Example
```bash
# Test local endpoints
curl -X GET "http://localhost:5173/api/endpoint"

# POST request example
curl -X POST "http://localhost:5173/api/endpoint" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

**Note**: The specific API endpoints and payloads will vary as the project grows. Always test the current endpoints rather than relying on documentation examples.

#### Development Workflow
1. **Test External APIs**: Use cURL to test external API endpoints first
2. **Check Response Format**: Understand the data structure before coding
3. **Test Local APIs**: Verify your endpoints work with cURL
4. **Use Test Pages**: Use available test pages for interactive testing
5. **Check Database**: Use `psql` to verify database schema and data
6. **Implement Feature**: Build the actual feature after understanding all dependencies

#### Debugging Tools
- **Browser Dev Tools**: Component inspection and network monitoring
- **Svelte Dev Tools**: State and component debugging
- **psql**: Connect directly to Neon database for schema and data inspection
- **cURL**: API endpoint testing and debugging
- **Test Pages**: Use available test pages for comprehensive API testing
- **Environment Files**: Check `.env` for configuration issues

### Debugging Tips
- **Database Issues**: 
  1. Check `.env` file for correct DATABASE_URL
  2. Use `psql $DATABASE_URL` to test direct connection
  3. Verify `/src/lib/database.js` connection configuration
- **API Issues**: 
  1. Test with cURL first to isolate the problem
  2. Use available test pages for interactive debugging
  3. Check server-side logs for detailed error messages
- **CORS Issues**: Use server-side proxy endpoints when needed
- **Environment Issues**: Verify all required variables are in `.env`
- **Styling Issues**: Use browser dev tools, styles are component-scoped
- **State Issues**: Check Svelte dev tools for reactive state
- **Performance Issues**: Monitor network tab for slow API calls

---

## 📝 Documentation Maintenance

**This documentation should evolve with the project.** When making significant changes, please update this file to reflect:

### When to Update This Documentation
- **New major features** or architectural changes
- **Database schema changes** or new table patterns
- **New external API integrations** or significant endpoint changes
- **New environment variables** or configuration requirements
- **New development tools** or workflow changes
- **Design system updates** or major UI pattern changes
- **New testing patterns** or debugging procedures

### How to Update
- **Keep it general** - Focus on patterns and principles rather than specific code
- **Provide discovery methods** - Show how to find current implementation details
- **Update examples** - Ensure example patterns reflect current practices
- **Maintain structure** - Keep the existing organization for consistency

### What NOT to Document Here
- **Specific API endpoints** - These change frequently, use discovery methods
- **Exact database schemas** - Use `psql` to get current structure
- **Hardcoded configurations** - Reference `.env` and config files instead
- **Implementation details** - Focus on architectural patterns

**Remember**: This document should help future developers understand the project quickly without becoming outdated. When in doubt, provide ways to discover current implementation rather than documenting specifics that may change.

*Keep this documentation accurate and useful for the next developer who works on this project.*