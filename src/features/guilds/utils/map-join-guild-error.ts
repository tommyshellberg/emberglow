/**
 * Maps a raw "join guild by invite code" failure into a friendly, user-facing
 * message. The mutation surfaces an Axios error whose `.message` is the ugly
 * default ("Request failed with status code 404"); this translates the status
 * (and, for 400s, the server's own message) into copy from `GUILD_ERRORS`.
 *
 * Server contract (unquest-server guild.service.js `joinByInviteCode`):
 * - 404 → unknown/invalid code
 * - 400 → "Already a member" | "Guild is full" | "Maximum guild limit reached"
 */
import axios from 'axios';

import { GUILD_ERRORS } from '../constants/guild-strings';

export function mapJoinGuildError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // No response object at all → the request never reached the server.
    if (!error.response) {
      return GUILD_ERRORS.NETWORK_ERROR;
    }

    const { status } = error.response;

    if (status === 404) {
      return GUILD_ERRORS.CODE_NOT_FOUND;
    }

    if (status === 400) {
      const serverMessage = String(
        (error.response.data as { message?: unknown } | undefined)?.message ??
          ''
      );
      if (/already a member/i.test(serverMessage)) {
        return GUILD_ERRORS.ALREADY_MEMBER;
      }
      if (/full/i.test(serverMessage)) {
        return GUILD_ERRORS.GUILD_FULL;
      }
      if (/maximum guild limit/i.test(serverMessage)) {
        return GUILD_ERRORS.MAX_GUILDS;
      }
    }
  }

  return GUILD_ERRORS.JOIN_FAILED;
}
