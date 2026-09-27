import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

export const organizationNameSchema = z.string().trim().min(2, "Company name is too short").max(100);

const signUpBase = {
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(128),
};

export const signUpSchema = z.object({ ...signUpBase, companyName: organizationNameSchema });

/** Joining via an invitation: no company is created. */
export const signUpWithInviteSchema = z.object({ ...signUpBase, invite: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

export const createOrganizationSchema = z.object({ companyName: organizationNameSchema });

export type FormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      /** Submitted non-secret values, echoed back so the form keeps them after an error. */
      values?: Record<string, string>;
      /** Set by actions that stay on the page after a successful save. */
      saved?: boolean;
      /** Shown once after creating an invitation. */
      inviteUrl?: string;
    }
  | undefined;
