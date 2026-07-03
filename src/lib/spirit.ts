import { Env } from '@env';

const DECAY_PER_DAY = 20;
const MAX_SPIRIT = 100;

export const isSpiritFadingEnabled = (): boolean =>
  Env.SPIRIT_FADING_ENABLED === 'true';

/** Whole local calendar days between two epoch-ms instants (0 if same local day). */
export const idleDaysBetween = (fromMs: number, toMs: number): number => {
  const from = new Date(fromMs);
  const to = new Date(toMs);
  const fromMidnight = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  ).getTime();
  const toMidnight = new Date(
    to.getFullYear(),
    to.getMonth(),
    to.getDate()
  ).getTime();
  const days = Math.floor((toMidnight - fromMidnight) / 86_400_000);
  return Math.max(0, days);
};

export const spiritFromIdleDays = (idleDays: number): number =>
  Math.max(0, MAX_SPIRIT - DECAY_PER_DAY * idleDays);

export type SpiritDisplay = {
  spirit: number | null;
  faded: boolean;
  active: boolean;
};

/**
 * Display spirit for the UI. Anchored to the server's last-reported value so a
 * returning-lapsed user (server says 100 at launch) is never wrongly faded client-side.
 * Decays only forward from serverSpiritAt.
 */
export const deriveDisplaySpirit = ({
  serverSpirit,
  serverSpiritAt,
  now = Date.now(),
}: {
  serverSpirit: number | null;
  serverSpiritAt: number | null;
  now?: number;
}): SpiritDisplay => {
  if (serverSpirit === null || serverSpiritAt === null) {
    return { spirit: null, faded: false, active: false };
  }
  const extraIdle = idleDaysBetween(serverSpiritAt, now);
  const spirit = Math.max(0, serverSpirit - DECAY_PER_DAY * extraIdle);
  return { spirit, faded: spirit === 0, active: true };
};

export { DECAY_PER_DAY, MAX_SPIRIT };
