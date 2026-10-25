import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginWithUsername, registerAccount } from "@/lib/auth.functions";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, registerSchema } from "@/lib/validation";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in or register | Pastimes" },
      { name: "description", content: "Log in to Pastimes or create a customer or vendor account." },
      { property: "og:title", content: "Log in or register | Pastimes" },
      { property: "og:description", content: "Log in to Pastimes or create a customer or vendor account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function AuthPage() {
  const [tab, setTab] = useState("login");
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-4xl">Welcome to Pastimes</h1>
        <p className="mt-2 text-muted-foreground">
          New accounts are reviewed by our team before you can buy or sell.
        </p>
        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="login"><LoginForm /></TabsContent>
          <TabsContent value="register"><RegisterForm onDone={() => setTab("login")} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LoginForm() {
  const login = useServerFn(loginWithUsername);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await login({ data: { username: String(f.get("username")), password: String(f.get("password")) } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await supabase.auth.setSession({ access_token: res.accessToken, refresh_token: res.refreshToken });
      toast.success("Welcome back");
      navigate({ to: "/account" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-username">Username</Label>
        <Input id="login-username" name="username" autoComplete="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Logging in..." : "Log in"}</Button>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const register = useServerFn(registerAccount);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accountType, setAccountType] = useState<"customer" | "vendor">("customer");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const values = {
      fullName: String(f.get("fullName") ?? ""),
      username: String(f.get("username") ?? ""),
      email: String(f.get("email") ?? ""),
      password: String(f.get("password") ?? ""),
      confirmPassword: String(f.get("confirmPassword") ?? ""),
      accountType,
    };
    const parsed = registerSchema.safeParse(values);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
    }
    const file = f.get("document") as File | null;
    if (!file || file.size === 0) next.document = "Upload an identity document";
    else if (!DOCUMENT_TYPES.includes(file.type)) next.document = "Upload a PDF, JPG or PNG document";
    else if (file.size > MAX_DOCUMENT_BYTES) next.document = "Document must be 5 MB or smaller";
    setErrors(next);
    if (Object.keys(next).length > 0 || !file) return;

    setBusy(true);
    try {
      const res = await register({
        data: { form: values, document: { name: file.name, type: file.type, base64: await toBase64(file) } },
      });
      if (!res.ok) {
        setErrors({ form: res.error });
        return;
      }
      formEl.reset();
      toast.success("Account created. You can log in once an admin approves it.");
      onDone();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const field = (name: string, label: string, type = "text", autoComplete?: string) => (
    <div className="space-y-2">
      <Label htmlFor={`reg-${name}`}>{label}</Label>
      <Input id={`reg-${name}`} name={name} type={type} autoComplete={autoComplete} />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <div className="space-y-2">
        <Label>I want to</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "vendor"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={accountType === t ? "default" : "outline"}
              onClick={() => setAccountType(t)}
            >
              {t === "customer" ? "Buy (Customer)" : "Sell (Vendor)"}
            </Button>
          ))}
        </div>
      </div>
      {field("fullName", "Full name", "text", "name")}
      {field("username", "Username", "text", "username")}
      {field("email", "Email", "email", "email")}
      {field("password", "Password (at least 8 characters)", "password", "new-password")}
      {field("confirmPassword", "Confirm password", "password", "new-password")}
      <div className="space-y-2">
        <Label htmlFor="reg-document">Identity document (PDF, JPG or PNG, up to 5 MB)</Label>
        <Input id="reg-document" name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" />
        {errors.document && <p className="text-sm text-destructive">{errors.document}</p>}
      </div>
      {errors.form && <p className="text-sm text-destructive" role="alert">{errors.form}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account..." : "Create account"}</Button>
    </form>
  );
}
