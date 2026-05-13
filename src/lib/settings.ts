import { prisma } from "./prisma";

/**
 * Key-value settings store (single-user, per-installation).
 *
 * Used so each user can configure their own Google OAuth credentials
 * inside the app instead of having to edit a `.env` file. This is what
 * makes the app shareable: every installation reads its own credentials
 * from its own SQLite database.
 */

export const SETTING_KEYS = {
  GOOGLE_CLIENT_ID: "google_client_id",
  GOOGLE_CLIENT_SECRET: "google_client_secret",
  GOOGLE_REDIRECT_URI: "google_redirect_uri",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await prisma.setting.deleteMany({ where: { key } });
}

/** Convenience: returns the full Google OAuth config or null if any required piece is missing. */
export async function getGoogleOAuthConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null> {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getSetting(SETTING_KEYS.GOOGLE_CLIENT_ID),
    getSetting(SETTING_KEYS.GOOGLE_CLIENT_SECRET),
    getSetting(SETTING_KEYS.GOOGLE_REDIRECT_URI),
  ]);
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: redirectUri || "http://localhost:3210/api/auth/google/callback",
  };
}
