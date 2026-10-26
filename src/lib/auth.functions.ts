import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, loginSchema, registerSchema } from "./validation";

const registerPayload = z.object({
  form: z.any(),
  document: z.object({
    name: z.string().max(200),
    type: z.string(),
    base64: z.string(),
  }),
});

// Creates a pending account and stores the identity document for admin review.
export const registerAccount = createServerFn({ method: "POST" })
  .validator((input: unknown) => registerPayload.parse(input))
  .handler(async ({ data }) => {
    const form = registerSchema.parse(data.form);
    if (!DOCUMENT_TYPES.includes(data.document.type)) {
      return { ok: false as const, error: "Upload a PDF, JPG or PNG document" };
    }
    const bytes = Uint8Array.from(atob(data.document.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
      return { ok: false as const, error: "Document must be 5 MB or smaller" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: taken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", form.username)
      .maybeSingle();
    if (taken) return { ok: false as const, error: "That username is already taken" };

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
      user_metadata: {
        full_name: form.fullName,
        username: form.username,
        account_type: form.accountType,
      },
    });
    if (error || !created.user) {
      const msg = error?.message?.toLowerCase().includes("already")
        ? "An account with that email already exists"
        : "Could not create the account. Please try again.";
      return { ok: false as const, error: msg };
    }

    const ext = data.document.type === "application/pdf" ? "pdf" : data.document.type.split("/")[1];
    const path = `${created.user.id}/identity.${ext}`;
    const upload = await supabaseAdmin.storage
      .from("documents")
      .upload(path, bytes, { contentType: data.document.type, upsert: true });
    if (upload.error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, error: "Could not upload the document. Please try again." };
    }
    await supabaseAdmin.from("profiles").update({ document_path: path }).eq("id", created.user.id);

    return { ok: true as const };
  });

// Signs in by username. Only approved accounts receive a session.
export const loginWithUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const invalid = { ok: false as const, error: "Incorrect username or password" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, status, review_note")
      .ilike("username", data.username)
      .maybeSingle();
    if (!profile) return invalid;

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: auth, error } = await client.auth.signInWithPassword({
      email: profile.email,
      password: data.password,
    });
    if (error || !auth.session) return invalid;

    if (profile.status !== "approved") {
      await client.auth.signOut();
      return {
        ok: false as const,
        error:
          profile.status === "pending"
            ? "Your account is waiting for admin approval. You can log in once it has been approved."
            : `Your account was not approved.${profile.review_note ? ` Reason: ${profile.review_note}` : ""}`,
      };
    }

    return {
      ok: true as const,
      accessToken: auth.session.access_token,
      refreshToken: auth.session.refresh_token,
    };
  });
