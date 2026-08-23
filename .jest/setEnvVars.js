// Set environment variables for testing.
// Must cover EVERY required var in the root env.js client schema: this file is
// what lets suites that require app.config.ts (e.g. app.config.test.ts) run
// hermetically — in CI there is no .env.* file, and dotenv never overrides
// values set here. A var added to env.js but not here fails only in CI.
process.env.API_URL = 'http://test-api.example.com';
process.env.ONESIGNAL_APP_ID = 'test-onesignal-id';
process.env.POSTHOG_API_KEY = 'test-posthog-key';
process.env.REVENUECAT_APPLE_API_KEY = 'test-revenuecat-apple-key';
process.env.REVENUECAT_GOOGLE_API_KEY = 'test-revenuecat-google-key';
process.env.GOOGLE_WEB_CLIENT_ID = 'test-google-web-client-id';
process.env.GOOGLE_IOS_CLIENT_ID = 'test-google-ios-client-id';
