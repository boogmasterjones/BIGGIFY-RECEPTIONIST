// The exact disclosure shown next to the opt-in checkbox. It is stored with every sms_consents row so we can show, later,
// what the person agreed to. Lives in its own module because a "use server" file may only export async functions.
export const CONSENT_TEXT =
  'By providing your phone number and checking this box, you agree to receive SMS customer care messages from BIGGIFY LLC: callback confirmations, follow-ups on a request you made, appointment reminders and a short intake survey, and a review request after a completed job. Message frequency may vary. Standard message and data rates may apply. Reply STOP to opt out. Reply HELP for help. We will not share mobile information with third parties for promotional or marketing purposes. Consent is not a condition of purchase.';
