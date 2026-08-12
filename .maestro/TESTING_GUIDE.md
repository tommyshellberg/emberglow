# UnQuest Maestro E2E Testing Guide

## Overview

This directory contains a comprehensive end-to-end test suite for the UnQuest mobile app using Maestro. The test suite covers ~85% of critical user flows including guest onboarding, authenticated user flows, and all major app screens.

## Test Architecture

### Single Fresh User Approach

The test suite uses a **single fresh user per test run** approach:

1. **Onboarding** - Creates a provisional user, completes first quest
2. **Conversion** - Converts provisional user to full authenticated user via database
3. **Fresh User Tests** - Tests with **known state**: Level 1, 50 XP, 1 quest completed
4. **Screen Coverage** - Tests all major app screens with accumulated state
5. **Regression** - Quick smoke tests for rapid validation

This approach provides:
- ✅ Predictable test state (always know exact XP, level, quests completed)
- ✅ Simpler maintenance (no managing multiple test accounts)
- ✅ Realistic flow (tests actual provisional → full user conversion)
- ✅ Exact value assertions (can assert specific XP/level values)

## Directory Structure

```
.maestro/
├── config.yaml                          # Guard rails for `maestro test .maestro/`
├── run-tests.sh                         # The supported entry point (`pnpm e2e`)
├── flows/
│   ├── 01-onboarding/
│   │   ├── onboarding-part-1.yaml      # Guest onboarding, starts the quest
│   │   └── onboarding-part-2.yaml      # Unlocks it — needs a 135s gap first
│   ├── 02-signup/
│   │   ├── 01-request-magic-link.yaml  # Provisional -> full user, part 1
│   │   └── 02-verify-authenticated.yaml # Reads Mailpit, opens the deep link
│   ├── 03-fresh-authenticated/
│   │   ├── 01-profile-verification.yaml   # Character numbers (runs LAST)
│   │   ├── 02-quest-second-part-1.yaml    # 2nd story quest, starts it
│   │   ├── 02-quest-second-part-2.yaml    # Unlocks it — 135s gap first
│   │   ├── 03-streak-celebration.yaml     # Verify Day 2 streak
│   │   └── 04-navigation-tabs.yaml        # Test tab navigation
│   ├── 04-screen-coverage/
│   │   ├── 01-profile-leaderboard-achievements.yaml
│   │   ├── 02-journal.yaml
│   │   ├── 03-custom-quest.yaml
│   │   ├── 04-map.yaml
│   │   ├── 05-settings.yaml
│   │   ├── 06-coop-ui.yaml
│   │   ├── 07-invite.yaml
│   │   ├── 08-guild.yaml
│   │   ├── 09-scheduled.yaml
│   │   └── 10-social-login.yaml        # SIGNS THE DEVICE OUT — own phase, last
│   └── 05-smoke/
│       └── critical-paths.yaml          # Quick smoke test (known stale)
├── scripts/
│   └── poll-magic-link.sh               # Dead, called by nothing (Linear SHE-55)
└── utils/                               # Reusable sub-flows, tagged `util`
```

## Prerequisites

### 1. Install Maestro

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or use the npm script
pnpm run install-maestro
```

### 2. Setup Test Environment

#### MongoDB Access
The conversion script requires access to your MongoDB database:

```bash
# Development database
export MONGODB_URI="mongodb://localhost:27017/unquest-dev"

# Or staging database
export MONGODB_URI="mongodb://your-staging-db-url"
```

⚠️ **Important**: Use a **test/development database**, not production!

#### Install Node Dependencies for Conversion Script
```bash
# The conversion script uses mongosh, ensure it's installed
brew install mongosh  # macOS
# or
npm install -g mongosh
```

### 3. Build and Install Staging App

**⚠️ IMPORTANT**: E2E tests run against **staging builds**, not development builds. Staging builds:
- ✅ Have no expo-dev-client (no dev menu/onboarding screens)
- ✅ Are production-like builds without dev screens
- ✅ Point to local development server (configured in `.env.staging`)
- ✅ Use bundle ID: `com.vaedros.unquest`

#### iOS Simulator

```bash
# 1. Build staging build via EAS
cd unquest
pnpm build:staging:ios

# 2. Wait for build to complete (~10-15 minutes)
# Download the .tar.gz file from EAS dashboard

# 3. Extract and install on simulator
tar -xzf ~/Downloads/<build-file>.tar.gz
xcrun simctl install booted <extracted-app>.app
```

#### Android Emulator

```bash
# 1. Build staging build via EAS
cd unquest
pnpm build:staging:android

# 2. Wait for build to complete (~10-15 minutes)
# Download the .apk file from EAS dashboard

# 3. Install on emulator
adb install ~/Downloads/<build-file>.apk
```

#### Verify Installation

```bash
# iOS
xcrun simctl listapps booted | grep staging

# Android
adb shell pm list packages | grep staging
```

#### Backend Server Configuration

Ensure your local backend server is running and accessible at the IP configured in `.env.staging`:

```bash
# Check current API URL in .env.staging
cat .env.staging | grep API_URL
# Should show: API_URL=http://192.168.178.67:3001/v1

# Test server is accessible
curl http://192.168.178.67:3001/v1/health

# If your server runs on different IP, update .env.staging and rebuild
```

## Running Tests

### Run Full Test Suite (Recommended)

```bash
# From unquest/ directory
cd unquest

# Run all tests with automatic orchestration
pnpm e2e

# Or run specific phases
pnpm e2e:onboarding   # Onboarding only (includes split test with 15s wait)
pnpm e2e:fresh        # Fresh authenticated user tests
pnpm e2e:coverage     # Screen coverage tests
pnpm e2e:regression   # Quick smoke tests
```

The `pnpm e2e` script uses `.maestro/run-tests.sh` which:
- ✅ Automatically generates a unique `test-<epoch>@example.com` address per run
- ✅ Waits 135 seconds between the two halves of each story quest
- ✅ Purges Mailpit and the matching users before a run that creates an account
- ✅ Runs every flow even after one fails, then summarises
- ✅ Provides clear progress output with colors
- ✅ Shows test duration summary

### Run Individual Test Phases (Advanced)

Always go through the runner. Every phase below needs something a bare
`maestro test <dir>` cannot give it — the generated `TEST_EMAIL`, the 135-second
quest waits, or an order that is not file-name order.

```bash
.maestro/run-tests.sh onboarding  # fresh install through the first quest
.maestro/run-tests.sh signup      # magic link, provisional -> full account
.maestro/run-tests.sh fresh       # second quest, tabs, profile numbers
.maestro/run-tests.sh coverage    # 04-screen-coverage/01..09, still signed in
.maestro/run-tests.sh smoke       # fast critical-path check
.maestro/run-tests.sh social      # 10-social-login.yaml — SIGNS THE DEVICE OUT
```

Each phase inherits the previous phase's end state, so running a later one on
its own only works if an earlier run left the device in the right place.

⚠️ **Note**: Onboarding tests are split into two parts with a 15-second wait. Use `./run-tests.sh onboarding` instead of running manually.

### Run Specific Tests

```bash
# Run a single test file
maestro test .maestro/flows/03-fresh-authenticated/01-profile-verification.yaml

# Run with debugging
maestro test .maestro/flows/01-onboarding/onboarding-full.yaml --debug
```

## Test Data & Expected States

### After Onboarding (Phase 1)
- **User Type**: Provisional
- **Level**: 1
- **XP**: 50
- **Quests Completed**: 1 ("Wake up")
- **Streak**: Day 1
- **Email**: test-{TIMESTAMP}@example.com — NOT `.test`. The server's email
  validator rejects the `.test` TLD with a 400. See `run-tests.sh` note 1.

### After Signup (Phase 2)
- **User Type**: Full authenticated user
- **State**: Same as above but `isProvisional: false`

### After Second Quest (Phase 3)
- **Level**: 1 (or 2 if XP threshold crossed)
- **XP**: 100
- **Quests Completed**: 2
- **Streak**: Day 2

## Test Assertions

The test suite uses **exact value assertions** for critical data:

```yaml
# Example: Exact XP assertion
- assertVisible:
    text: '50'
    below: 'XP Gained'

# Example: Exact level assertion
- assertVisible:
    text: 'Level 1'

# Example: Streak assertion
- assertVisible:
    text: '2'
- assertVisible: 'Day Streak'
```

This ensures we catch any regressions in XP calculations, level progression, or streak tracking.

## Troubleshooting

### Issue: Staging app not found

**Symptom**: Maestro fails with "App not found: com.vaedros.unquest.staging"

**Solutions**:
1. Verify staging app is installed:
   ```bash
   # iOS
   xcrun simctl listapps booted | grep staging

   # Android
   adb shell pm list packages | grep staging
   ```
2. If not installed, follow "Build and Install Staging App" section above
3. Ensure correct simulator/emulator is booted
4. Check bundle ID in `.maestro/config.yaml` matches installed app

### Issue: API connection errors

**Symptom**: App shows "Network error" or blank screens during tests

**Solutions**:
1. Verify backend server is running:
   ```bash
   curl http://192.168.178.67:3001/v1/health
   ```
2. Check `.env.staging` API_URL matches your server IP:
   ```bash
   cat .env.staging | grep API_URL
   ```
3. If server IP changed, update `.env.staging` and rebuild staging app
4. Ensure no firewall blocking the connection
5. For iOS simulator, verify IP is accessible from simulator

### Issue: Dev menu screens appearing

**Symptom**: Tests fail because expo-dev-client screens are showing

**Solutions**:
1. Verify you're using **staging build**, not development build
2. Check installed app bundle ID is `com.vaedros.unquest`
3. Rebuild staging app if accidentally using development build
4. Staging builds should have NO dev client or dev menu

### Issue: Conversion script fails

**Symptom**: Phase 2 fails with "No user found with email"

**Solutions**:
1. Verify the TEST_EMAIL matches what was used in onboarding
2. Check MongoDB URI is correct and accessible
3. Verify mongosh is installed: `mongosh --version`
4. Run conversion script manually:
   ```bash
   TEST_EMAIL="test-123@unquest.test" \
   MONGODB_URI="mongodb://localhost:27017/unquest-dev" \
   node .maestro/scripts/convert-provisional-user.js
   ```

### Issue: Quest doesn't complete after 15 seconds

**Symptom**: Test hangs during quest wait in part 2

**Solutions**:
1. Verify quest duration override is active in backend (should be 10 seconds)
2. Check `unquest-server/src/controllers/quest-template.controller.js` lines 31-33
3. Ensure `NODE_ENV=development` is set on backend server
4. Verify backend logs show "Override duration in development mode"
5. If needed, increase wait time in `run-tests.sh` (currently 15 seconds)

### Issue: UI elements not found

**Symptom**: Test fails with "Element not visible"

**Solutions**:
1. Check if app is in correct state (check previous test outputs)
2. Verify text labels haven't changed in the app
3. Use `--debug` flag to see current screen state
4. Update test with correct element identifiers
5. Check screenshots in `~/.maestro/tests/<timestamp>/` for visual debugging

### Issue: Test data conflicts

**Symptom**: Multiple test runs interfere with each other

**Solutions**:
1. Always use unique timestamp for TEST_EMAIL (automatic with `pnpm e2e`)
2. Clear app state between runs: `clearState` in test files (already present)
3. Use separate test database per developer
4. Clean up test users periodically from database

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Run E2E Tests
        env:
          MONGODB_URI: ${{ secrets.TEST_MONGODB_URI }}
          TEST_EMAIL_TIMESTAMP: ${{ github.run_number }}
        run: |
          maestro test .maestro/ \
            --env TEST_EMAIL="test-$TEST_EMAIL_TIMESTAMP@unquest.test" \
            --env MONGODB_URI="$MONGODB_URI" \
            --format junit \
            --output results.xml

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: results.xml
```

## Test Coverage

### Current Coverage (~85% of critical paths)

✅ **Onboarding Flow**
- Welcome screen
- Character creation (name + type)
- App introduction
- Notification permissions
- First quest completion
- Account creation

✅ **Authenticated User Flows**
- Profile verification
- Quest selection and completion
- Streak celebration
- Tab navigation

✅ **Screen Coverage**
- Profile (with exact XP/level/streak values)
- Leaderboard (Friends & Global tabs)
- Achievements
- Journal
- Custom quest creation
- Map navigation
- Settings
- Cooperative quest UI

✅ **Regression Tests**
- Critical path smoke tests

### Not Currently Covered
- ❌ Actual multiplayer coordination (only UI tested)
- ❌ Payment/subscription flows
- ❌ Social features (friend invites, sharing)
- ❌ Offline sync behavior
- ❌ Push notification interactions

## Best Practices

### 1. Use Unique Emails Per Run
Always generate unique test emails to avoid conflicts:
```bash
TEST_EMAIL="test-$(date +%s)@unquest.test"
```

### 2. Clean Up Test Data
Periodically clean up test users from your database:
```javascript
// MongoDB shell
db.users.deleteMany({
  email: { $regex: /^test-.*@unquest\.test$/ },
  createdAt: { $lt: new Date(Date.now() - 7*24*60*60*1000) } // Older than 7 days
})
```

### 3. Run Tests in Isolation
Each test run should start fresh with `clearState` to ensure predictable results.

### 4. Use Exact Assertions for Critical Values
Always assert exact XP, level, and streak values to catch calculation bugs early.

### 5. Keep Tests Fast
The full suite takes ~8 minutes (2.5 min × 2 quests + setup/navigation time).
Use regression tests for rapid feedback during development.

## Maintenance

### Updating Tests After UI Changes

1. **Text Changes**: Update assertions in affected test files
2. **Navigation Changes**: Update tap points or element identifiers
3. **New Features**: Add new test files in appropriate phase directory
4. **Flow Changes**: Update test sequence in config.yaml

### Adding New Tests

1. Create test file in appropriate phase directory
2. Follow naming convention: `##-descriptive-name.yaml`
3. Add clear comments explaining test purpose and expected state
4. Use exact value assertions where applicable
5. Update this README if adding new test categories

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Maestro docs: https://maestro.mobile.dev
3. Check test file comments for specific flow details
4. Contact the team if stuck

## Example: Complete Setup and Test Run

```bash
# =============================================================================
# FIRST TIME SETUP
# =============================================================================

# 1. Build staging app (one-time, or when code changes)
cd unquest
pnpm build:staging:ios  # or pnpm build:staging:android

# Wait ~10-15 minutes for EAS build to complete
# Download from EAS dashboard and install

# iOS:
tar -xzf ~/Downloads/<build>.tar.gz
xcrun simctl install booted <app>.app

# Android:
adb install ~/Downloads/<build>.apk

# =============================================================================
# BEFORE EACH TEST RUN
# =============================================================================

# 2. Start local backend server
cd ../unquest-server
npm run dev

# 3. Verify server is accessible
curl http://192.168.178.67:3001/v1/health

# 4. Ensure MongoDB is running (if local)
# mongod should already be running, or:
# mongod --dbpath /path/to/data

# =============================================================================
# RUN TESTS
# =============================================================================

# 5. Boot simulator/emulator (if not already running)
open -a Simulator  # iOS
# or Android Studio → AVD Manager

# 6. Run full test suite
cd unquest
pnpm e2e

# Or run specific phases
pnpm e2e:onboarding   # ~2-3 minutes
pnpm e2e:regression   # ~30 seconds (quick smoke test)

# =============================================================================
# DEBUGGING FAILED TESTS
# =============================================================================

# Check screenshots of failures
ls -la ~/.maestro/tests/$(ls -t ~/.maestro/tests | head -1)/

# Run single flow with debug output
maestro test .maestro/flows/01-onboarding/onboarding-part-1.yaml --debug

# Check app state
xcrun simctl listapps booted | grep staging  # iOS
adb shell pm list packages | grep staging    # Android
```

## Quick Reference

| Command | Purpose | Duration |
|---------|---------|----------|
| `pnpm e2e` | Full test suite | ~8 minutes |
| `pnpm e2e:onboarding` | Onboarding only | ~2-3 minutes |
| `pnpm e2e:regression` | Smoke tests | ~30 seconds |
| `pnpm build:staging:ios` | Build staging for iOS | ~10-15 minutes |
| `pnpm build:staging:android` | Build staging for Android | ~10-15 minutes |

## Key Files

- `.maestro/config.yaml` - Global test configuration, bundle ID
- `.maestro/run-tests.sh` - Test orchestration script
- `.env.staging` - Staging environment configuration (API URL, keys)
- `eas.json` - EAS build profiles for staging
- `TESTING_GUIDE.md` - This file

Happy Testing! 🎮✨
