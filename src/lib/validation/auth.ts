import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

export const organizationNameSchema = z.string().trim().min(2, "Company name is too short").max(100);

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(128),
  companyName: organizationNameSchema,
});

export const createOrganizationSchema = z.object({ companyName: organizationNameSchema });

export type FormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      /** Submitted non-secret values, echoed back so the form keeps them after an error. */
      values?: Record<string, string>;
    }
  | undefined;
