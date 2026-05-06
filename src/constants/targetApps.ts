export const TARGET_APPS: Record<string, string> = {
  'com.zhiliaoapp.musically': 'TikTok',
  'com.ss.android.ugc.trill': 'TikTok',
  'com.instagram.android': 'Instagram',
  'com.google.android.youtube': 'YouTube',
  'com.snapchat.android': 'Snapchat',
};

export const BLOCKING_TIERS = {
  /** 1–4 min in session: gentle push notification nudge */
  SOFT: 'soft',
  /** 5–14 min in session: overlay with 30 s reflection timer */
  FRICTION: 'friction',
  /** 15+ min in session: full-screen hard lock */
  HARD: 'hard',
} as const;

export type BlockingTier = (typeof BLOCKING_TIERS)[keyof typeof BLOCKING_TIERS];

/** Thresholds in minutes before each tier activates */
export const TIER_THRESHOLDS: Record<BlockingTier, number> = {
  [BLOCKING_TIERS.SOFT]: 1,
  [BLOCKING_TIERS.FRICTION]: 5,
  [BLOCKING_TIERS.HARD]: 15,
};

export const isTargetApp = (packageName: string): boolean =>
  packageName in TARGET_APPS;

export const getAppDisplayName = (packageName: string): string =>
  TARGET_APPS[packageName] ?? packageName;
