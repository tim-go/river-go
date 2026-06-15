/**
 * Whether a member may contribute to shared community data. Kept pure so it can
 * be unit-tested independently of React state. Email verification is only
 * required when the (relaxable) flag is on.
 */
export function evaluateContributorGate(input: {
  isSignedIn: boolean;
  emailVerified: boolean;
  hasPublicName: boolean;
  hasAcceptedTerms: boolean;
  requireEmailVerification: boolean;
}): boolean {
  return (
    input.isSignedIn &&
    (!input.requireEmailVerification || input.emailVerified) &&
    input.hasPublicName &&
    input.hasAcceptedTerms
  );
}
