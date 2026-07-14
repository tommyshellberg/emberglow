import { GUILD_ERRORS } from '../../constants/guild-strings';
import { mapJoinGuildError } from '../map-join-guild-error';

/** Build a minimal axios-shaped error the way `axios.isAxiosError` recognises it. */
function axiosError(status: number | undefined, message?: string) {
  return {
    isAxiosError: true,
    response: status ? { status, data: message ? { message } : {} } : undefined,
  };
}

describe('mapJoinGuildError', () => {
  it('maps a 404 (wrong/unknown code) to the friendly not-found copy', () => {
    expect(mapJoinGuildError(axiosError(404, 'Invalid invite code'))).toBe(
      GUILD_ERRORS.CODE_NOT_FOUND
    );
  });

  it('maps a missing response (network failure) to the network error copy', () => {
    expect(mapJoinGuildError(axiosError(undefined))).toBe(
      GUILD_ERRORS.NETWORK_ERROR
    );
  });

  it('maps a 400 "Already a member" to the already-member copy', () => {
    expect(mapJoinGuildError(axiosError(400, 'Already a member'))).toBe(
      GUILD_ERRORS.ALREADY_MEMBER
    );
  });

  it('maps a 400 "Guild is full" to the guild-full copy', () => {
    expect(mapJoinGuildError(axiosError(400, 'Guild is full'))).toBe(
      GUILD_ERRORS.GUILD_FULL
    );
  });

  it('maps a 400 "Maximum guild limit reached" to the max-guilds copy', () => {
    expect(
      mapJoinGuildError(axiosError(400, 'Maximum guild limit reached'))
    ).toBe(GUILD_ERRORS.MAX_GUILDS);
  });

  it('falls back to the generic join-failed copy for an unrecognised 400', () => {
    expect(mapJoinGuildError(axiosError(400, 'Some new server message'))).toBe(
      GUILD_ERRORS.JOIN_FAILED
    );
  });

  it('falls back to the generic join-failed copy for a 500', () => {
    expect(mapJoinGuildError(axiosError(500))).toBe(GUILD_ERRORS.JOIN_FAILED);
  });

  it('falls back to the generic join-failed copy for a non-axios error', () => {
    expect(mapJoinGuildError(new Error('boom'))).toBe(GUILD_ERRORS.JOIN_FAILED);
    expect(mapJoinGuildError(undefined)).toBe(GUILD_ERRORS.JOIN_FAILED);
  });
});
