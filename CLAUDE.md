# Claude AI Assistant Instructions

## 📋 Project Context
This is **BetterCallSold**, a SvelteKit-based e-commerce admin panel with CommentSold API integration. Before working on this project, always read the comprehensive project documentation.

## 📖 Required Reading
**MANDATORY**: Read `/PROJECT_INFO.md` first before making any changes or suggestions. This file contains:
- Complete project architecture and tech stack details
- Database schema and Neon PostgreSQL credentials
- UI/UX design system and Shopify-inspired styling guidelines
- CommentSold API integration patterns
- Development workflow and testing procedures
- Known issues, solutions, and design decisions

## 🔧 Development Rules

### API Development Protocol
1. **Test with cURL FIRST**: Before modifying any API endpoints, test them with cURL to understand expected behavior
2. **Use Test UI**: Leverage `/test-cs-api` page for interactive API testing
3. **Server-side Proxy**: Use `/api/test-cs/*` endpoints to avoid CORS issues
4. **Error Handling**: Implement comprehensive error handling with user-friendly messages

### Code Standards
- **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect` for reactive state management
- **TypeScript**: Maintain type safety throughout the codebase
- **Component CSS**: Use scoped styles, follow existing design patterns
- **Database**: Use PostgreSQL with JSONB for complex data, UUID for primary keys

### UI/UX Guidelines
- **Shopify Design**: Follow Shopify admin panel design patterns exactly
- **Color Palette**: Use documented color scheme (Shopify green #00a96e, blue #005bd3)
- **Typography**: Follow documented typography scale and font weights
- **Responsive**: Ensure mobile-friendly design with proper breakpoints

### Testing Requirements
- **cURL Testing**: Test all API endpoints with cURL before implementation
- **UI Testing**: Use test pages for comprehensive functionality testing
- **Error Scenarios**: Test error conditions and edge cases
- **Database Testing**: Verify database operations with proper multi-tenant isolation

## 🚨 Critical Information
- **Database**: Neon PostgreSQL (serverless) - connection details in PROJECT_INFO.md
- **Multi-tenant**: All database operations must include `tenant_id`
- **API Integration**: CommentSold API requires specific headers and error handling
- **State Management**: Use Svelte 5 runes, not legacy reactive statements
- **CORS**: External API calls must go through server-side proxy endpoints

## 🔍 Debugging Process
1. Check PROJECT_INFO.md for known issues and solutions
2. Test APIs with cURL to isolate problems
3. Use `/test-cs-api` page for interactive debugging
4. Check server logs for detailed error messages
5. Verify database connections and queries

## 📝 Documentation Updates
When making significant changes:
1. Update PROJECT_INFO.md with new patterns or decisions
2. Document any new API endpoints or database schema changes
3. Update known issues and solutions sections
4. Maintain the development workflow documentation

## 🎯 Project Goals
- Create a professional Shopify-like admin interface
- Seamlessly integrate with CommentSold API for product management
- Maintain clean, scalable architecture with proper error handling
- Provide comprehensive testing and debugging tools

---

**Remember**: This project has specific patterns and architectural decisions documented in PROJECT_INFO.md. Always reference this documentation to maintain consistency and avoid rework.