import { z } from "zod";

export const INVITE_ROLES = ["ADMIN", "MEMBER"] as const;

export const inviteSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  role: z.enum(INVITE_ROLES),
});

export const roleChangeSchema = z.object({
  membershipId: z.string().min(1).max(64),
  role: z.enum(INVITE_ROLES),
});

/** Invitation tokens are 32 random bytes, base64url-encoded (43 chars). */
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
