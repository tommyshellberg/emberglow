# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

unQuest is a React Native mobile app built with Expo that gamifies daily tasks through story-driven quests. The app uses TypeScript, React Navigation, TanStack Query, Zustand for state management, and NativeWind for styling.

## Instructions

- Avoid excessive politeness, flattery, or empty affirmations.
- Avoid over-enthusiasm or emotionally charged language.
- Be direct and factual, focusing on usefulness, clarity, and logic.
- Prioritize truth and clarity over appeasing me.
- Challenge assumptions or offer corrections anytime you get a chance.
- Point out any flaws in the questions or solutions I suggest.
- Use a test-driven development approach.

## Common Development Commands

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run a single test file
pnpm test src/app/(app)/index.test.tsx

# Run tests with coverage
pnpm test:ci
```

### Code Quality
```bash
# Run all checks (lint, type-check, translations, tests)
pnpm check-all

# Run linter
pnpm lint

# Type checking
pnpm type-check

# Lint translations
pnpm lint:translations

# Format code with Prettier (run before committing)
pnpm prettier --write .
```

## Architecture Overview

### Navigation Structure
The app uses Expo Router (file-based routing) with the following key navigation flows:

1. **Authentication Flow**: `/login` → provisional auth → full auth after quest completion
2. **Onboarding Flow**: `/onboarding/*` → character selection → first quest → signup
3. **Main App**: Tab navigation at `/(app)/*` with home, journal, map, profile, and settings

The navigation state is managed by `navigation-state-resolver.ts` which determines routing based on:
- Auth status (hydrating, signOut, signIn)
- Onboarding completion status
- Active quest states (pending, completed, failed)

### State Management

**Zustand Stores** (persisted with MMKV):
- `quest-store.ts`: Manages active/pending/completed quests, quest progression
- `character-store.ts`: User character data, XP, levels, streaks
- `onboarding-store.ts`: Tracks onboarding progress through steps
- `user-store.ts`: User profile data
- `settings-store.ts`: App settings and preferences
- `poi-store.ts`: Points of interest on the map

**Key State Patterns**:
- Direct subscriptions for real-time updates (e.g., quest state changes)
- Persist middleware for offline support
- Getters for accessing state outside React components

### Quest System

Quests are the core feature with two types:
1. **Story Quests**: Pre-defined narrative quests with branching paths
2. **Custom Quests**: User-created tasks

Quest flow:
1. User selects quest → `prepareQuest()` sets it as pending
2. Navigate to `/pending-quest` → countdown → `startQuest()`
3. Background timer runs → completion/failure → navigate to result screen
4. Result screen shows XP gained, story progression, next options

### API Layer

- Uses Axios with TanStack Query for data fetching
- Provisional authentication for new users (complete quests before signup)
- Full authentication after email verification
- API client with request/response interceptors for auth tokens

### Testing Approach

- Jest + React Native Testing Library
- Test utilities in `src/lib/test-utils.tsx` with providers setup
- Mock patterns for:
  - Navigation (`expo-router`)
  - Native modules (`react-native-reanimated`)
  - Stores (Zustand mocks with shared state)
- Focus on user interactions and state changes

### Test-Driven Development (TDD)

**IMPORTANT**: Always follow TDD principles when implementing new functionality:

1. **Red Phase**: Write a failing test FIRST that describes the desired behavior
   - Run the test to verify it fails for the right reason
   - The test should fail because the functionality doesn't exist yet
   - Use React Native Testing Library to test components from the user's perspective

2. **Green Phase**: Write the minimal code needed to make the test pass
   - Implement only what's necessary to satisfy the test
   - Avoid over-engineering or adding features not covered by tests
   - Focus on making the test pass, not on perfect code

3. **Refactor Phase**: Clean up the code while keeping tests green
   - Improve code quality, readability, and performance
   - Ensure all tests still pass after refactoring
   - Extract reusable logic into hooks or utilities as needed

4. **Verify Phase (mutation testing)**: Prove each new assertion can actually fail
   - Run `pnpm test:mutate <path-to-source-file>`. Stryker mutates operators,
     conditionals, boundaries, and literals exhaustively — including forcing every
     guard both always-true and always-false — and reports which mutants your tests
     failed to kill. Use this instead of hand-editing source and restoring it.
   - Every surviving mutant is either a test gap or an equivalent mutant (semantically
     identical, unkillable). Classify it; don't reflexively chase the score.
   - **Stryker does not mutate fixtures. This part stays manual:** data equal to a
     fallback, a default, or the post-mutation value asserts nothing, and no tool can
     detect that. Check it by hand.
   - MANDATORY when there was no genuine Red phase — a test written against code that
     already works has never been proven capable of failing.

**Rules**:
- Never write implementation code without a failing test that requires it
- Run tests frequently (`pnpm test:watch`) to verify each small change
- Write ONE test at a time, not multiple tests in a batch
- Test user behavior and outcomes, not implementation details
- Mock external dependencies (API calls, navigation, native modules)
- Use `test-utils.tsx` wrapper for consistent test setup with providers
- A passing test is not evidence until you have watched it fail — in the Red phase or under a mutation
- Assume a new assertion is vacuous until mutation proves otherwise: `toMatchObject({})`, `expect.anything()` against `undefined`, RNTL matching hidden elements, and fixtures equal to their fallback all pass silently
- Report mutation results when claiming a fix works ("reverting the fix fails 7 tests"), not just the green count

### Key Technical Decisions

1. **File-based routing** with Expo Router for simpler navigation
2. **NativeWind** for utility-first styling (Tailwind for React Native)
3. **Zustand** over Redux for simpler state management
4. **MMKV** for fast persistent storage
5. **Provisional auth** to reduce signup friction
6. **Background timers** for quest tracking when app is backgrounded

## Environment Configuration

Environment variables are managed through `.env.{environment}` files:
- `development`, `staging`, `production`
- Validated with Zod schemas in `env.js`
- Client vars exposed via `@env` import
- Build-time vars used in `app.config.ts`

## Code Conventions

- **File naming**: kebab-case for all files
- **Component structure**: Functional components with hooks
- **Imports**: Absolute imports via `@/` alias
- **State updates**: Prefer direct Zustand actions over hooks when possible
- **Testing**: Co-locate tests with components, use `.test.tsx` extension
- **Styling**: Use NativeWind classes, avoid inline styles
- **Code formatting**: Run `pnpm prettier --write .` before committing changes