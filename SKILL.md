---
name: SaaS Product Architect
description: Provides comprehensive guidance and best practices for developing a modern, scalable SaaS application, from architecture to deployment.
---

# SaaS Product Architect Skill

## When to use this skill
Use this skill when initiating a new SaaS project, planning features, or auditing an existing codebase for best practices related to **scalability, security, and maintainability**.

## Architecture Patterns and Project Structure
*   **Monorepo Strategy:** Recommend a monorepo structure for managing related services (frontend, backend, shared libraries).
*   **Microservices/Modular Design:** Suggest modular design principles to ensure components can be scaled independently.
*   **Tech Stack Recommendations:** Prioritize modern, robust frameworks (e.g., Next.js for frontend, Node/Python for backend, PostgreSQL for primary data store).
*   **Project Structure:** Enforce a clear, standardized folder structure (e.g., `/src`, `/scripts`, `/docs`, `/tests`).

## Key Feature Implementation Guidance

### Authentication & Authorization
*   Implement robust authentication using established libraries or services (e.g., Auth0, Clerk, or self-hosted solutions).
*   Utilize role-based access control (RBAC) and Row Level Security (RLS) in the database to manage permissions.
*   Emphasize secure password management (hashing, salting) and 2FA options.

### Database Design
*   **Schema Design:** Design database schemas with scalability and performance in mind, ensuring proper indexing for common queries.
*   **Multi-tenancy:** Detail the approach for multi-tenancy (e.g., separate schemas, shared database with tenant isolation columns).

### API Design
*   Follow RESTful or GraphQL API design patterns.
*   Implement clear API documentation (e.g., OpenAPI specs).

### UI/UX Best Practices
*   Use established component libraries (e.g., shadcn/ui) for consistency and speed.
*   Focus on an intuitive user experience with clear user flows.

## Operational Skills

### Testing
*   **Unit/Integration/E2E Testing:** Mandate comprehensive test coverage using frameworks like Playwright or Jest.
*   **CI/CD Integration:** Integrate automated testing into the CI/CD pipeline.

### Security
*   **Vulnerability Scanning:** Ensure regular security audits and vulnerability scanning.
*   **Secrets Management:** Never commit secrets to version control; use environment variables or a dedicated secrets manager.

### Deployment & Scaling
*   **Cloud Providers:** Recommend reliable cloud platforms (e.g., Vercel, AWS, GCP).
*   **CI/CD Pipeline:** Define the Continuous Integration/Continuous Deployment workflow, ideally automated from commit to production.
*   **Monitoring/Logging:** Establish monitoring and logging solutions (e.g., Sentry) for quick issue detection and debugging.

## References & Assets
*   **[SaaS Architecture Guide](docs/architecture.md)**: Detailed architectural decision records.
*   **[Database Schema Template](assets/schema_template.sql)**: A starting SQL template for core SaaS tables.
*   **[CI/CD Script](scripts/deploy.sh)**: An example deployment script.
*   **[Project Planning Phase Template](references/planning_phases.md)**: A multi-phase project plan.
