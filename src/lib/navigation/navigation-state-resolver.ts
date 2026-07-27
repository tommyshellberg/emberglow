import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { getItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

export type NavigationTarget =
  | { type: 'pending-quest'; questId: string }
  | { type: 'cooperative-pending-quest'; questId: string }
  | { type: 'quest-result'; questId: string; outcome: 'completed' | 'failed' }
  | { type: 'first-quest-result'; outcome: 'completed' | 'failed' }
  | { type: 'quest-completed-signup' }
  | { type: 'streak-celebration' }
  | { type: 'onboarding' }
  | { type: 'login' }
  | { type: 'app' }
  | { type: 'no-hero' }
  | { type: 'loading' };

export function useNavigationTarget(): NavigationTarget {
  // Get auth, onboarding, and character state
  const authStatus = useAuth((state) => state.status);
  const isOnboardingComplete = useOnboardingStore((s) =>
    s.isOnboardingComplete()
  );
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const character = useCharacterStore((s) => s.character);
  const serverUser = useUserStore((s) => s.user);

  // Use direct subscription for quest state including completed quests
  const [questState, setQuestState] = useState(() => {
    const state = useQuestStore.getState();
    return {
      pendingQuest: state.pendingQuest,
      recentCompletedQuest: state.recentCompletedQuest,
      failedQuest: state.failedQuest,
      completedQuests: state.completedQuests,
      shouldShowStreakCelebration: state.shouldShowStreakCelebration,
    };
  });

  // Subscribe to quest store changes directly
  useEffect(() => {
    console.log(
      '🧭 Setting up quest store subscription at',
      new Date().toISOString()
    );

    const unsubscribe = useQuestStore.subscribe((state) => {
      console.log('🧭 Quest store changed at', new Date().toISOString(), {
        pendingQuest: state.pendingQuest?.id || null,
        recentCompletedQuest: state.recentCompletedQuest?.id || null,
        failedQuest: state.failedQuest?.id || null,
        completedQuestsCount: state.completedQuests.length,
        shouldShowStreakCelebration: state.shouldShowStreakCelebration,
      });
      setQuestState({
        pendingQuest: state.pendingQuest,
        recentCompletedQuest: state.recentCompletedQuest,
        failedQuest: state.failedQuest,
        completedQuests: state.completedQuests,
        shouldShowStreakCelebration: state.shouldShowStreakCelebration,
      });
    });

    return () => {
      console.log('🧭 Cleaning up quest store subscription');
      unsubscribe();
    };
  }, []);

  const {
    pendingQuest,
    recentCompletedQuest,
    failedQuest,
    completedQuests,
    shouldShowStreakCelebration,
  } = questState;

  // A social signup (resolveSocialUser branch 4) mints a full, verified
  // account with no character, so its owner never passes through onboarding.
  // The server is the authority on that: transformUserResponse reports a null
  // character as `type: ''` / `name: ''`, so an EMPTY string here means "this
  // account has no hero", while `serverUser === null` means the post-sign-in
  // fetch simply hasn't landed yet — a different state, and the one the
  // force-complete branch below is for. Computed here (not just inside the
  // effect) so the render's return value below can act on it synchronously.
  //
  // Checks both `type` and `name`, not just `type`: every user-reachable write
  // path (createProvisionalUser, PATCH /users/me — user.validation.js) marks
  // both fields required on the same request, so in ordinary onboarding they
  // are never set independently. The one exception is the admin-only
  // PATCH /users/:userId route (`manageUsers` scope), whose validation allows
  // a partial character object and whose Mongoose update only validates the
  // paths being $set — so a type-without-name (or vice versa) row isn't
  // reachable from the app, but isn't impossible in the database either. This
  // check is this account's last-line safety net, so covering that DB-only
  // edge case costs nothing.
  const serverAccountHasNoCharacter =
    !!serverUser && !(serverUser.type && serverUser.name);

  // Synchronize onboarding state when user is signed in but onboarding appears incomplete
  useEffect(() => {
    if (authStatus !== 'signIn') return;

    // Check if user has provisional data (indicating they're a new user going through onboarding)
    const hasProvisionalData = !!(
      getItem('provisionalUserId') ||
      getItem('provisionalAccessToken') ||
      getItem('provisionalEmail')
    );
    if (hasProvisionalData) return;

    // The hero-less case is handled synchronously below (type: 'no-hero') so
    // it can't flash the app before this effect runs. resetOnboarding is no
    // longer called here: it belongs to the '/no-hero' screen's button, which
    // fires it when the user acts rather than as a side effect of a render.
    if (serverAccountHasNoCharacter && !character) {
      return;
    }

    // Only from a standing start — or from the very last step. NOT_STARTED
    // is a verified user opening a fresh install. VIEWING_SIGNUP_PROMPT is a
    // provisional user whose signup on the claim-your-legend screen just
    // succeeded: socialSignIn/verifyMagicLink cleared the provisional keys
    // (so the hasProvisionalData guard above no longer returns early), and
    // both conversion paths rely on THIS effect to finish onboarding — it is
    // the last step, so completing from it skips nothing. Every step in
    // between means onboarding is actively in progress (the no-hero flow runs
    // it fully authenticated); completing those mid-flow would skip the intro
    // and first quest the user was sent back for.
    if (
      !isOnboardingComplete &&
      (currentStep === OnboardingStep.NOT_STARTED ||
        currentStep === OnboardingStep.VIEWING_SIGNUP_PROMPT)
    ) {
      // User is signed in with no provisional data and no local data
      // This indicates they're a verified user logging in on a fresh install
      console.log(
        '🧭 Detected verified user with no local data - marking onboarding as complete'
      );

      // Mark onboarding as complete for verified users
      setCurrentStep(OnboardingStep.COMPLETED);
    }
  }, [
    authStatus,
    isOnboardingComplete,
    currentStep,
    character,
    serverUser,
    completedQuests,
    setCurrentStep,
    serverAccountHasNoCharacter,
  ]);

  // Debug current state
  useEffect(() => {
    console.log('🧭 Navigation target evaluation:', {
      authStatus,
      isOnboardingComplete,
      currentStep,
      completedQuestsCount: completedQuests?.length || 0,
      pendingQuest: pendingQuest?.id || null,
      recentCompletedQuest: recentCompletedQuest?.id || null,
      failedQuest: failedQuest?.id || null,
      shouldShowStreakCelebration,
    });
  }, [
    authStatus,
    isOnboardingComplete,
    character,
    currentStep,
    completedQuests,
    pendingQuest,
    recentCompletedQuest,
    failedQuest,
    shouldShowStreakCelebration,
  ]);

  // Still hydrating? Don't make routing decisions yet
  if (authStatus === 'hydrating') {
    console.log('🧭 Auth still hydrating');
    return { type: 'loading' };
  }

  // Provisional users hydrate with status 'signIn' (see auth hydrate()), so
  // authStatus alone can't identify the onboarding first-quest flow after an
  // app restart — check for a provisional session as well.
  const hasProvisionalSession = !!(
    getItem('provisionalUserId') || getItem('provisionalAccessToken')
  );
  // A signed-in, non-provisional user can ALSO be mid-onboarding: a social
  // signup with no hero is routed back through it fully authenticated, and no
  // provisional session ever exists on that path. Any started-but-unfinished
  // step therefore counts; NOT_STARTED stays excluded so a verified user on a
  // fresh install (force-completed by the sync effect above) isn't captured.
  const isInOnboardingFlow =
    !isOnboardingComplete &&
    (authStatus === 'signOut' ||
      hasProvisionalSession ||
      currentStep !== OnboardingStep.NOT_STARTED);

  // Priority 1: Streak celebration (highest priority to show before quest complete)
  if (shouldShowStreakCelebration) {
    console.log('🧭 Should show streak celebration');
    return { type: 'streak-celebration' };
  }

  // Priority 2: Active quest states
  if (pendingQuest) {
    // Check if it's a cooperative quest
    const isCooperative = pendingQuest.mode === 'cooperative';
    if (isCooperative) {
      console.log(
        '🧭 Found cooperative pending quest, should redirect to cooperative-pending-quest:',
        pendingQuest.id
      );
      return { type: 'cooperative-pending-quest', questId: pendingQuest.id };
    }
    console.log(
      '🧭 Found pending quest, should redirect to pending-quest:',
      pendingQuest.id
    );
    return { type: 'pending-quest', questId: pendingQuest.id };
  }

  if (failedQuest) {
    console.log('🧭 Found failed quest:', failedQuest.id);
    // Don't navigate to quest details if the quest ID is undefined
    if (!failedQuest.id || failedQuest.id === 'undefined') {
      console.log('🧭 Failed quest has undefined ID, skipping navigation');
      // Clear the failed quest to prevent this from happening again
      useQuestStore.getState().resetFailedQuest();
      return { type: 'app' };
    }

    // During onboarding (signed out or provisional), any failed quest should go to first-quest-result
    if (isInOnboardingFlow) {
      console.log(
        '🧭 Quest failed during onboarding, showing first-quest-result'
      );
      return { type: 'first-quest-result', outcome: 'failed' };
    }

    return { type: 'quest-result', questId: failedQuest.id, outcome: 'failed' };
  }

  if (recentCompletedQuest) {
    console.log('🧭 Found completed quest:', recentCompletedQuest.id);
    // Don't navigate to quest details if the quest ID is undefined
    if (!recentCompletedQuest.id || recentCompletedQuest.id === 'undefined') {
      console.log('🧭 Completed quest has undefined ID, skipping navigation');
      // Clear the completed quest to prevent this from happening again
      useQuestStore.getState().clearRecentCompletedQuest();
      return { type: 'app' };
    }

    // During onboarding (signed out or provisional), any completed quest should go to first-quest-result
    if (isInOnboardingFlow) {
      console.log(
        '🧭 Quest completed during onboarding, showing first-quest-result'
      );
      return { type: 'first-quest-result', outcome: 'completed' };
    }

    return {
      type: 'quest-result',
      questId: recentCompletedQuest.id,
      outcome: 'completed',
    };
  }

  // Priority 2.5: Hero-less signed-in account. Checked synchronously here
  // (not only inside the sync effect above) so a signed-in account with no
  // server-side character never renders '/(app)' for a frame before this
  // fires — that flash-then-correct was the original defect.
  if (authStatus === 'signIn' && serverAccountHasNoCharacter && !character) {
    console.log(
      '🧭 Signed-in account has no character on the server - explaining before onboarding'
    );
    return { type: 'no-hero' };
  }

  // Priority 3: Onboarding
  if (!isOnboardingComplete) {
    console.log(
      '🧭 [NavigationStateResolver] Current onboarding step:',
      currentStep
    );
    console.log(
      '🧭 Onboarding not complete (or no character data for legacy users)'
    );

    // Special case: If we're at VIEWING_SIGNUP_PROMPT, it means the user completed quest-1
    // but hasn't signed up yet. They should see the signup prompt, not go back to onboarding.
    if (currentStep === OnboardingStep.VIEWING_SIGNUP_PROMPT) {
      console.log(
        '🧭 User completed first quest but not signed up, showing quest-completed-signup'
      );
      // Navigate directly to the signup prompt screen
      return { type: 'quest-completed-signup' };
    }

    return { type: 'onboarding' };
  }

  // Priority 4: Authentication
  if (authStatus === 'signOut') {
    console.log('🧭 User signed out');
    return { type: 'login' };
  }

  // Priority 5: Default to app
  console.log('🧭 Default to app');
  return { type: 'app' };
}
