import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin, getAdminAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff sign in — Scentlyn" },
      { name: "description", content: "Sign in to manage the Scentlyn store." },
      { property: "og:title", content: "Staff sign in — Scentlyn" },
      { property: "og:description", content: "Sign in to manage the Scentlyn store." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Access = { isAdmin: boolean; adminExists: boolean; email: string | null };

function AuthPage() {
  const navigate = useNavigate();
  const accessFn = useServerFn(getAdminAccess);
  const claimFn = useServerFn(claimFirstAdmin);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);
  const [checking, setChecking] = useState(true);

  async function refreshAccess() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setAccess(null);
      setChecking(false);
      return;
    }
    try {
      const result = await accessFn();
      setAccess(result);
      if (result.isAdmin) navigate({ to: "/admin", replace: true });
    } catch {
      setAccess(null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await refreshAccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    try {
      const result = await claimFn();
      if (result.isAdmin) {
        toast.success("You're now the store admin");
        navigate({ to: "/admin", replace: true });
      } else toast.error("An admin already exists. Ask them to add you.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not claim admin access");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAccess(null);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-7">
        <div className="mb-6 text-center">
          <div className="font-display text-4xl italic">
            Scentlyn<span className="text-accent">✦</span>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Store manager</p>
        </div>

        {checking ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : access ? (
          <div className="space-y-4 text-center text-sm">
            <p>
              Signed in as <strong>{access.email}</strong>
            </p>
            {!access.adminExists ? (
              <>
                <p className="text-muted-foreground">
                  No store admin has been set up yet. Claim it now to make this account the store owner. This can only
                  be done once.
                </p>
                <Button className="w-full" onClick={claim} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}Claim first admin
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">This account doesn't have staff access. Ask the store admin to add you.</p>
            )}
            <Button variant="ghost" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "First time? Create an account" : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
