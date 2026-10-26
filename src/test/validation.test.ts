import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validation";

const valid = {
  fullName: "Thandi Khumalo",
  username: "thandi_k",
  email: "thandi@example.com",
  password: "Pastimes#2026",
  confirmPassword: "Pastimes#2026",
  accountType: "vendor" as const,
};

describe("account registration rules", () => {
  it("accepts a complete customer or vendor registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "Ab1#xyz", confirmPassword: "Ab1#xyz" }).success).toBe(false);
  });

  it("rejects a confirm password that does not match", () => {
    expect(registerSchema.safeParse({ ...valid, confirmPassword: "Different#2026" }).success).toBe(false);
  });

  it("does not allow signing up as an admin", () => {
    expect(registerSchema.safeParse({ ...valid, accountType: "admin" }).success).toBe(false);
  });
});
