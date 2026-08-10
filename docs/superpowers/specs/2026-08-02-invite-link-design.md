# Invite a Friend with a Link — Design

**Date:** 2026-08-02
**Status:** Approved direction (validated section-by-section in brainstorming)
**Issue:** tommyshellberg/emberglow#290
**Supersedes:** `2026-07-21-social-invites-design.md` (its manual-code-entry UX is explicitly rejected here; its codebase audit remains accurate)

## Goal

A user shares one permanent link (`https://emberglowapp.com/i/{code}`). Anyone who taps it gets to the right app store, and after installing and opening the app they are attributed to the inviter **with no code entry and no contact picking**. The invitee gets a one-tap confirm ("X invited you — connect?"); confirming creates a pending friend request that the **link owner** approves or rejects. The same infrastructure tracks marketing/creator campaign installs (`/c/{code}`) without any friendship semantics.

## Decisions (made during brainstorming)

1. **DIY probabilistic attribution** — no third-party SDK. Branch's free tier caps at ~10K MAU with an enterprise-pricing cliff; AppsFlyer has no meaningful free tier. Branch is the documented fallback if match rates disappoint.
2. **One permanent invite link per user** — no per-share minting. Per-share source analytics come from a `?src=` param appended at share time.
3. **Universal links + Android App Links are set up as part of this feature** (neither exists today). Requires new native builds — this feature cannot ship OTA.
4. **Invitee quick-confirm before anything is created** — absorbs fingerprint false positives and avoids leaking the invitee's profile to a wrong inviter.
5. **Campaign links: schema + tracking now, no admin UI** — `/c/{code}` works end-to-end; campaign codes are created by script; payout reporting is a PostHog/Mongo query.

## Architecture

```
Share sheet ──> emberglowapp.com/i/{code}?src=...
                      │  (Vercel rewrite /i/* and /c/* → API server)
                      ▼
        GET /i/:code on API server (public, strictLimiter)
        • record InviteClick {kind, code, ipHash, platform, src}
        • PostHog invite_link_clicked
        • interstitial page → store redirect
          (Play URL carries &referrer=emberglow_invite%3D{code})
                      │
         install ──> first app open ──> POST /v1/invites/match
                      │   (referrer wins; else ipHash+platform ≤48h)
                      ▼
        friend match: confirm prompt ──> POST /v1/invites/claim
                      │
                      ▼
        plain existing Invitation (sender=invitee, recipientUser=owner)
        → owner's existing pending-invite UI → accept/reject → mutual friends
```

Already-installed users tapping `/i/{code}` skip everything probabilistic: the universal link opens the app route directly with the exact code (deterministic). Brand-new users who re-tap the link after installing also land on the deterministic path.

### Why the invite direction inverts

The claim creates a standard `Invitation` document with `sender = invitee` and `recipientUser = owner`, and adds the invitee to the owner's `pendingFriends`. From that point the owner's existing invite list, `PATCH /v1/users/invites/:id/accept|reject`, and mutual-friending logic run **unchanged**. No new approval lifecycle is built.

### match vs claim separation

`POST /v1/invites/match` is read-only ("who invited me?") and creates nothing; `POST /v1/invites/claim` is the only mutation. A false fingerprint match therefore costs nothing — the human confirm sits between them. Deterministic entries (universal link, Play referrer) skip `match` entirely.

## Server changes (`unquest-server`)

### Data

- **`User.inviteCode`** — short unique sparse-indexed code, lazily generated with `crypto.randomBytes` (same recipe as guild invite codes, `guild.service.js`).
- **`User.inviteAttribution`** — `{ kind: 'friend'|'campaign', code, matchedAt, declined?: boolean }`, written once at match time. Serves as match idempotency guard and campaign-payout dedupe source.
- **`InviteClick`** (new model) — `{ kind, code, ipHash, platform: 'ios'|'android'|'other', src, createdAt }` with a **72h TTL index**. `ipHash` is an HMAC of the client IP with a server secret — raw IPs are never stored.
- **`Campaign`** (new model) — `{ code (unique), name, source, active }`. Created via script; no CRUD endpoints in this build.

### Endpoints (route → Joi validate → catchAsync controller → service, house style)

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /v1/users/me/invite-link` | auth (provisional OK) | Returns `{ code, url }`, lazily minting `inviteCode`. |
| `GET /i/:code`, `GET /c/:code` | public, `strictLimiter` | Validate code (User.inviteCode / Campaign.code), record `InviteClick`, PostHog `invite_link_clicked`, render interstitial (pattern: `magic-link-page.js`; `Cache-Control: no-store`) that auto-redirects to the store by user-agent with both store buttons as fallback. Unknown code → generic "invite link isn't valid" page **with store buttons**, identical shape for both kinds (no enumeration signal). |
| `POST /v1/invites/match` | auth (provisional OK) | Body: `{ platform, installReferrer? }`. Android referrer wins (deterministic). Else newest `InviteClick` matching `ipHash` + platform within 48h, excluding the caller's own code. Friend match → return `{ code, inviter: { characterName } }`, create nothing. Campaign match → record attribution server-side (`inviteAttribution` + PostHog `campaign_install_attributed`), return nothing actionable. Stamps `inviteAttribution` on any successful match (friend or campaign) so a match never fires twice per user; a no-match leaves it unset, allowing a retry on a later cold start. No-match → null. |
| `POST /v1/invites/claim` | auth (provisional OK) | Body: `{ code }`. Guards: code exists (else 404), not self (400), not already friends / no existing pending pair (200 with `status: 'already_friends'|'already_pending'` — never an error for a fine state). Creates `Invitation { sender: invitee, recipient: owner.email, recipientUser: owner, status: 'pending' }` + `$addToSet` invitee into owner's `pendingFriends`. |

Vercel (`unquest-landing-page`): rewrites for `/i/*` and `/c/*` → API server; static `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` in `public/`. Only `/i/*` appears in AASA/App Links paths — campaign links must always reach the web page and bounce to the store.

## Mobile app changes (`unquest`)

- **Share flow:** "Invite a friend" action on the profile screen (contact-import entry points remain). `useInviteLink` react-query hook fetches the link; native `Share.share` (guild-screen pattern) sends message + link with `?src=` context param. PostHog `invite_link_shared`.
- **First-launch match:** after provisional user creation succeeds (`choose-character.tsx` flow), call `POST /invites/match` once — reading the Play Install Referrer first on Android (small native lib, e.g. `react-native-play-install-referrer`). Friend match → store in a small MMKV-persisted Zustand slice (the prompt survives an app restart, since the server has already stamped the attribution and will not re-match) → confirm modal ("**{characterName} invited you to Emberglow — connect with them?**") shown at the next natural pause after onboarding, never interrupting character creation. Confirm → `claim` → toast. Dismiss → server stamps `declined`, never re-prompted. Match failure is swallowed and logged — attribution must never block onboarding; retried on next cold start only while `inviteAttribution` is unset.
- **Universal link route:** new `src/app/i/[code].tsx`. Existing/provisional session → same confirm prompt with the URL's code (no fingerprint). No session yet → stash code in MMKV (`pendingInviteCode`), run normal onboarding, then skip `match` and go straight to confirm → claim with the stashed code.
- **Native config (bare workflow — edit native dirs directly, `app.config.ts` plugins are inert):** iOS `applinks:emberglowapp.com` entitlement; Android `autoVerify` https intent filter for `emberglowapp.com` path prefix `/i/`; `assetlinks.json` carries the release signing cert fingerprint. New native builds required on both platforms.
- **Owner side: no new UI.** The claim appears in the existing pending-invitations list with accept/reject. Optional copy tweak ("joined via your invite link") only if cheaply distinguishable; skip if fiddly.

## Analytics (PostHog, both SDKs already integrated)

Funnel: `invite_link_shared` (app) → `invite_link_clicked` (server; src/UTM/platform/country) → `invite_match_found` | `campaign_install_attributed` (server) → `invite_claimed` (server) → `invite_accepted_by_owner` (server, added to existing accept path).

Campaign installs are countable as distinct users where `inviteAttribution.code = X`. Android campaign counts are deterministic (Play referrer); iOS counts are good-faith probabilistic estimates — state the methodology in creator deals. The `clicked` − `match_found` gap quantifies probabilistic loss.

## Edge cases

- **Self-claim:** claim → 400 `ApiError`; match never returns the caller's own code.
- **Ambiguous fingerprint** (two codes, same ipHash+platform in window): newest wins; the named-inviter confirm lets a human decline a wrong guess.
- **Expired window / VPN / no click record:** match → null; app silent. Accepted loss, measured by the funnel.
- **Owner account deleted before claim:** claim 404; app drops the flow with a neutral toast.
- **Double-tap / re-tapped link:** claim returns 200 with `already_pending` / `already_friends`, no user-facing error.
- **No email is sent anywhere in this flow** — the existing invite path's email-failure/rescind logic does not apply.

## Security & privacy

- Public routes behind `strictLimiter`; identical generic pages for valid-shape-but-unknown codes.
- IPs stored only as HMAC hashes; click records self-purge after 72h.
- Fingerprint match reveals nothing without the invitee's confirm; owner approval is the second human gate.

## Testing

- **Server (Vitest, precedents: `friend-invite-email.test.js`, `magiclink-open.test.js`):** click recording + TTL field; interstitial (per-UA store redirect, referrer param, `no-store`); match (referrer beats fingerprint, window, newest-wins, own-code exclusion, idempotency stamp, campaign vs friend branch); claim guards (self / already-friends / duplicate-pending / dead code); full happy path click → match → claim → existing accept → mutual friends. After green, mutate guards both ways (e.g. remove own-code exclusion) and confirm the specific tests go red.
- **App (Jest + RNTL):** `useInviteLink`; match-on-first-launch effect (mocked API, failure-swallowing); confirm modal render/confirm/dismiss; MMKV stash path for link-before-onboarding.
- **Manual/device:** iOS universal link on a real device (AASA validation), `adb shell pm get-app-links` verification, one real Play referrer round-trip via the internal-testing track.

## Out of scope

Invite rewards/incentives; campaign CRUD or admin UI; payout reports beyond PostHog queries; Branch migration (documented fallback only); removing the contact-import flow.
