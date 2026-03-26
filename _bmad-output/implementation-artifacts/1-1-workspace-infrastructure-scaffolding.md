# Story 1.1: Workspace & Infrastructure Scaffolding

## Story Foundation
**User Story:**
As a developer, I want to initialize the Nx Workspace with React, Vite, and NestJS, So that the foundational monorepo structure is ready for feature development following the architecture decisions.

**Acceptance Criteria:**
- Given the project root directory
- When the Nx creation command is executed
- Then an `apps/web` (React+Vite) and `apps/api` (NestJS) structure is created
- And the `libs/shared` directory is available for shared DTOs and types.

## Developer Context & Guardrails

### Technical Requirements
- Initialize the project as an Nx Monorepo setup.
- Frontend MUST use React 19 bundled with Vite.
- Backend MUST use NestJS.
- Styling setup MUST support CSS (specifically Tailwind CSS later).

### Architecture Compliance
- Project initialization is the foundational step.
- Follow strict `kebab-case.ts` naming convention for all files in the Nx monorepo.
- `apps/web`: React/Vite application
- `apps/api`: NestJS application
- `libs/shared`: Shared types, DTOs

### Library & Framework Requirements
- Nx CLI (`create-nx-workspace`, `@nx/nest`)
- React 19
- Vite
- NestJS

### File Structure Requirements
```text
ultimatype-monorepo/
├── apps/
│   ├── web/                      # [Frontend React + Vite]
│   └── api/                      # [Backend NestJS]
└── libs/
    └── shared/                   # Shared types & DTOs
```

### Testing Requirements
- `e2eTestRunner` should be set to `none` initially as per architecture constraints for the workspace init command.

### Latest Tech Information
- The required commands to bootstrap the exact architecture are:
  1. `npx create-nx-workspace@latest ultimatype-monorepo --preset=react-monorepo --bundler=vite --e2eTestRunner=none --style=css`
  2. `cd ultimatype-monorepo`
  3. `npm install -D @nx/nest`
  4. `npx nx g @nx/nest:application api`

### Project Context Reference
- Ensure changes align with the "Kinetic Monospace" UX directives and the "No-Line Rule" when creating frontend scaffolding.
- The monorepo will act as the single source of truth for both WebSockets and REST features.

## Status
**Status:** done
**Note:** Ultimate context engine analysis completed - comprehensive developer guide created.

### Review Findings
- [x] [Review][Decision] Missing `libs/shared` directory — Resolved: generated via `npx nx g @nx/js:library --directory=libs/shared`
- [x] [Review][Patch] Linter inconsistency — Resolved: created `apps/api/eslint.config.mjs` extending root config
- [x] [Review][Defer] File naming convention not enforced — deferred, pre-existing
