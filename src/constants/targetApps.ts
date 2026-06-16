export const BLOCKING_TIERS = {
  SOFT: 'soft',
  FRICTION: 'friction',
  HARD: 'hard',
} as const;

export type BlockingTier = typeof BLOCKING_TIERS[keyof typeof BLOCKING_TIERS];

export const TIER_THRESHOLDS: Record<BlockingTier, number> = {
  [BLOCKING_TIERS.SOFT]: 5,      // After 5 minutes
  [BLOCKING_TIERS.FRICTION]: 15, // After 15 minutes
  [BLOCKING_TIERS.HARD]: 30,     // After 30 minutes
};

export const TARGET_APPS = {
  'com.instagram.android': { displayName: 'Instagram' },
  'com.facebook.katana': { displayName: 'Facebook' },
  'com.twitter.android': { displayName: 'X (Twitter)' },
  'com.reddit.frontpage': { displayName: 'Reddit' },
  'com.snapchat.android': { displayName: 'Snapchat' },
  'com.tiktok.android': { displayName: 'TikTok' },
  'com.netflix.mediaclient': { displayName: 'Netflix' },
  'com.spotify.music': { displayName: 'Spotify' },
  'com.youtube.android': { displayName: 'YouTube' },
} as const;

export function isTargetApp(packageName: string): boolean {
  return packageName in TARGET_APPS;
}

export function getDisplayName(packageName: string): string {
  const app = TARGET_APPS[packageName as keyof typeof TARGET_APPS];
  return app?.displayName || packageName;
}