import * as Sentry from '@sentry/react-native';
import { logger, sentryTransport } from 'react-native-logs';

/**
 * react-native-logs' sentryTransport types its `SENTRY` option narrower than
 * the real Sentry client: it declares `addBreadcrumb` as accepting
 * `string | { message: string }`, while the SDK's real `addBreadcrumb` only
 * accepts a `Breadcrumb` object (every field, including `message`, optional).
 * In practice the transport's implementation only ever calls
 * `addBreadcrumb({ message: msg })`, which is a valid `Breadcrumb`, so this is
 * a mismatch between two third-party type definitions rather than a real bug.
 * Assert the real client against the transport's declared option shape.
 * @typedef {{
 *   captureException: (msg: string | typeof Error) => void,
 *   addBreadcrumb: (msg: string | { message: string }) => void,
 * }} SentryLogTransportClient
 */

export const log = logger.createLogger({
  severity: 'debug',
  transport: sentryTransport,
  transportOptions: {
    SENTRY: /** @type {SentryLogTransportClient} */ (Sentry),
    errorLevels: 'error',
  },
});
