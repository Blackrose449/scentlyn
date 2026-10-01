import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ShoppingCart, Package, Users, Settings as SettingsIcon, Menu, X, LogOut, Store } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: "bg-status-pending/15 text-status-pending",
    paid: "bg-status-paid/15 text-status-paid",
    packing: "bg-status-packing/20 text-status-packing",
    delivered: "bg-status-delivered/15 text-status-delivered",
    cancelled: "bg-status-cancelled/15 text-status-cancelled",
    failed: "bg-status-cancelled/15 text-status-cancelled",
    active: "bg-status-paid/15 text-status-paid",
    draft: "bg-status-pending/15 text-status-pending",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tone[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function AdminCard({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-lg border border-border bg-card p-5", className)}>{children}</section>;
}

export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav className="grid gap-1" aria-label="Dashboard sections">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-l-2 border-accent bg-accent/10 text-accent"
                : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ email, children }: { email?: string | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-secondary lg:flex lg:min-h-screen lg:flex-col lg:p-5">
        <Link to="/admin" className="font-display text-3xl italic text-foreground">
          Scentlyn<span className="text-accent">✦</span>
        </Link>
        <p className="mb-8 mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Store manager</p>
        <NavItems />
        <div className="mt-auto space-y-3 pt-6 text-xs text-muted-foreground">
          {email ? <p className="truncate">{email}</p> : null}
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground hover:text-accent">
            <Store className="size-4" /> View storefront
          </Link>
          <button type="button" onClick={signOut} className="flex items-center gap-2 font-semibold text-foreground hover:text-accent">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-secondary px-4 py-3 lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Open dashboard menu" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
        <span className="font-display text-2xl italic">Scentlyn✦</span>
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
          <LogOut />
        </Button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-[80%] max-w-xs bg-secondary p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-2xl italic">Scentlyn✦</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
