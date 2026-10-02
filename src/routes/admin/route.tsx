import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Store manager — Scentlyn" },
      { name: "description", content: "Manage Scentlyn orders, products, customers and settings." },
      { property: "og:title", content: "Store manager — Scentlyn" },
      { property: "og:description", content: "Manage Scentlyn orders, products, customers and settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const accessFn = useServerFn(getAdminAccess);
  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => accessFn(), staleTime: 60_000 });

  if (access.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (!access.data?.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="font-display text-3xl">Staff only</h1>
          <p className="text-sm text-muted-foreground">This account doesn't have access to the store manager.</p>
          <Button asChild>
            <Link to="/auth">Go to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <AdminShell email={access.data.email}>
      <Outlet />
    </AdminShell>
  );
}
