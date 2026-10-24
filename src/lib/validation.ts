import { z } from "zod";

// Shared rules for account creation, used by the form and the server.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .regex(/^[A-Za-z0-9_.]+$/, "Use letters, numbers, dots or underscores only"),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(72),
    confirmPassword: z.string(),
    accountType: z.enum(["customer", "vendor"]),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(30),
  password: z.string().min(1, "Enter your password").max(72),
});

export const formatRand = (amount: number) =>
  `R ${Number(amount).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;
