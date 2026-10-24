import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader({ cartCount, onCart }: { cartCount?: number; onCart?: () => void }) {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link to="/" className="font-display text-2xl font-semibold text-primary">
          Pastimes
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" className="hover:text-accent">Shop</Link>
          {user && <Link to="/account" className="hover:text-accent">My account</Link>}
          {isAdmin && <Link to="/admin" className="hover:text-accent">Admin</Link>}
          {onCart && (
            <Button size="sm" onClick={onCart}>
              Cart ({cartCount ?? 0})
            </Button>
          )}
          {user ? (
            <>
              <span className="text-muted-foreground">@{profile?.username}</span>
              <Button size="sm" variant="outline" onClick={signOut}>Log out</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
