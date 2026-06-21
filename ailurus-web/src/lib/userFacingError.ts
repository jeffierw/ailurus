export class UserFacingError extends Error {
  readonly userMessage: string;

  constructor(technicalMessage: string, userMessage: string, options?: { cause?: unknown }) {
    super(technicalMessage, options);
    this.name = 'UserFacingError';
    this.userMessage = userMessage;
  }
}

export function logAppError(context: string, error: unknown) {
  if (error === undefined) {
    console.error(`[Ailurus] ${context}`, 'Unknown error (undefined)');
    return;
  }
  console.error(`[Ailurus] ${context}`, error);
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error === undefined || error === null) return fallback;
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.length > 0) return record.message;
    if (typeof record.error === 'string' && record.error.length > 0) return record.error;
    if (typeof record.requestId === 'string' && record.requestId.length > 0) return record.requestId;
  }
  return fallback;
}

export function toUserFacingMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof UserFacingError) return error.userMessage;

  const raw = extractErrorText(error);

  if (/ECreatorAlreadyExists|Creator profile already exists/i.test(raw)) {
    return 'You already have a creator profile. We loaded your existing profile.';
  }
  if (/ECreatorNotFound|Creator profile not found/i.test(raw)) {
    return 'Set up your creator profile before publishing content.';
  }
  if (/EInvalidPrice|price must be greater than zero/i.test(raw)) {
    return 'Enter a subscription price greater than zero.';
  }
  if (/EPriceTooHigh|price is above/i.test(raw)) {
    return 'That subscription price is too high for now. Try a lower amount.';
  }
  if (/EInsufficientPayment|Insufficient USDC|insufficient.*usdc/i.test(raw)) {
    return 'Insufficient USDC balance for this action.';
  }
  if (/Package ID used in PTB is invalid|is not the first version/i.test(raw)) {
    return 'Encrypted media configuration is out of date. Refresh the page and try again.';
  }
  if (/ENoSealAccess|does not have access/i.test(raw)) {
    return 'Subscribe to this creator to unlock this content.';
  }
  if (/Seal key servers did not return|Not enough shares/i.test(raw)) {
    return 'Could not unlock media. Refresh the page and try again.';
  }
  if (/Personal message signature was not returned|Not signed in|Google sign-in is not configured/i.test(raw)) {
    return raw;
  }
  if (/Upload faucet|upload funding|upload credits|faucet wallet/i.test(raw)) {
    return 'Upload credits are temporarily unavailable. Please try again in a moment.';
  }
  if (/Sponsor create failed|Sponsor execute failed|Enoki request failed/i.test(raw)) {
    return 'We could not complete that action. Please try again.';
  }
  if (/Network request failed|Failed to fetch/i.test(raw)) {
    return 'Network error. Check your connection and try again.';
  }
  if (isTechnicalError(raw)) return fallback;

  return raw.length > 0 && raw.length < 120 ? raw : fallback;
}

function extractErrorText(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isTechnicalError(text: string): boolean {
  return (
    /MoveAbort|Transaction resolution failed|0x[a-f0-9]{16,}::|::platform::|::system::|line \d+\)/i.test(
      text,
    ) || /"issues"\s*:/.test(text)
  );
}
