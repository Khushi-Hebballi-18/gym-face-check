import { z } from "zod";

export const memberSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  phone: z.string()
    .trim()
    .optional()
    .transform((val) => val || "")
    .refine((val) => val === "" || /^\+?[1-9]\d{9,14}$/.test(val), {
      message: "Invalid phone format (use format: +91 9876543210)"
    }),
  membershipMonths: z.number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(120, "Maximum 10 years"),
  membershipDays: z.number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(365, "Maximum 365 days")
});

export type MemberInput = z.infer<typeof memberSchema>;
