# Maestro E2E Test Suite

This directory contains comprehensive end-to-end tests for the UnQuest app using Maestro.

> ⚠️ **This README is deprecated.** Please see [TESTING_GUIDE.md](./TESTING_GUIDE.md) for the latest comprehensive testing documentation.

## Quick Start

```bash
# Run full test suite
pnpm e2e

# Run specific test phases
pnpm e2e:onboarding     # Guest onboarding only
pnpm e2e:fresh          # Fresh authenticated user tests
pnpm e2e:coverage       # Screen coverage tests
pnpm e2e:regression     # Quick smoke tests
```

For detailed documentation, see [TESTING_GUIDE.md](./TESTING_GUIDE.md).

---

## Legacy Documentation

This directory contains comprehensive end-to-end tests for the emberglow app using Maestro.

## Test Organization

### 📱 Auth Flow Tests (`/auth/`)

#### **onboarding.yaml** - Complete User Journey (Welcome → Login)

**Coverage**: Comprehensive end-to-end test covering the entire user flow

- ✅ Welcome screen with app branding and navigation options
- ✅ Complete app introduction with step-by-step guidance
- ✅ Notifications permission handling
- ✅ Character creation, naming, and carousel selection
- ✅ First quest introduction and setup
- ✅ Quest preparation and cancellation flows (robustness testing)
- ✅ Direct login path for existing users
- ✅ Login form interaction and submission

**Why One Comprehensive Test?**
Since Maestro tests start with `clearState`, separate test files can't share app state. A quest completion test would have no quest to complete! This comprehensive approach ensures we test the complete user journey as it actually happens.

**User Journeys Covered**:

1. **New User**: Welcome → Onboarding → Character creation → Quest setup
2. **Existing User**: Welcome → Direct login

#### **login-with-validation.yaml** - Login Form Validation

**Coverage**: Focused testing of login form validation and magic link functionality

- ✅ Email input validation (invalid/valid states)
- ✅ Button enable/disable based on input
- ✅ Magic link sending confirmation
- ✅ Form field interactions and error handling

**User Journey**: Login form → Email validation → Magic link sent

### 🏠 App Tests (`/app/`)

- `tabs.yaml` - Tab navigation testing
- `create-post.yaml` - Post creation functionality

### 🛠️ Utils (`/utils/`)

- Utility flows for common test operations

## Running Tests

### Individual Test Flows

```bash
# Test complete user journey (onboarding + login paths)
maestro test .maestro/auth/onboarding.yaml

# Test login form validation specifically
maestro test .maestro/auth/login-with-validation.yaml
```

### Run All Auth Tests

```bash
maestro test .maestro/auth/
```

### Run All Tests

```bash
maestro test .maestro/
```

## Test Coverage Summary

### ✅ **Comprehensive Coverage**

**Complete User Journeys**:

1. **New User Flow**: Welcome → App intro → Notifications → Character creation → Quest setup
2. **Existing User Flow**: Welcome → Direct login
3. **Edge Cases**: Quest cancellation, character carousel navigation, form validation

**Key Interactions Tested**:

- Welcome screen navigation (new vs existing users)
- Multi-step app introduction flow
- Character naming and type selection via carousel
- Quest preparation and cancellation
- Login form validation and submission
- Button state management (enabled/disabled)

### 🎯 **Key Testing Principles Applied**

- **Component Modularity**: Focused test sections with clear responsibilities
- **Behavior Testing**: Tests user-observable behavior and interactions
- **State Management**: Single comprehensive test maintains app state throughout journey
- **Edge Case Handling**: Quest cancellation, character navigation, form validation
- **Real User Experience**: Tests actual user interactions and decision points

### 📝 **Test Design Notes**

**Why Combined Tests Work Better**:

- **State Continuity**: App state is maintained throughout the complete user journey
- **Realistic Flow**: Tests how users actually experience the app (sequential, not isolated)
- **Comprehensive Coverage**: Single test ensures entire onboarding process works end-to-end

**Quest Completion Testing**:
The current test covers onboarding up to quest setup. Quest completion → signup prompt → login flow would require:

- Background app state simulation (lock/unlock phone)
- Test hooks to skip to post-quest state
- Or live quest duration completion (impractical for CI/CD)

## Prerequisites

- Maestro CLI installed
- iOS/Android simulator running
- App built with development configuration
- Test device/simulator configured for the target app bundle ID

## CI vs. Local

These flows no longer run in GitHub Actions — running them in CI required either
Apple-billed macOS runners or a paid Maestro Cloud device farm per PR, and they
were gated behind PR labels, so in practice they weren't running on most PRs anyway.

Instead:

- `.husky/pre-push` runs the fast `05-smoke/critical-paths.yaml` smoke flow
  automatically before every `git push`, when a device/emulator is connected with
  the app already running. It skips (doesn't block) if no device is available.
- Before opening or merging a PR with app-facing changes, run the fuller suite
  locally: `pnpm e2e` (all phases) or a scoped phase like `pnpm e2e:onboarding`.
