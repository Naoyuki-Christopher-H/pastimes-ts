import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import hero from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cartTotal, fetchAvailableItems, fetchCart, type Item } from "@/lib/shop";
import { formatRand } from "@/lib/validation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pastimes | Second-hand branded clothing" },
      { name: "description", content: "Browse, buy and sell pre-loved branded clothing in great condition." },
      { property: "og:title", content: "Pastimes | Second-hand branded clothing" },
      { property: "og:description", content: "Browse, buy and sell pre-loved branded clothing in great condition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cartOpen, setCartOpen] = useState(false);
  const [messageFor, setMessageFor] = useState<Item | null>(null);

  const items = useQuery({ queryKey: ["items", "available"], queryFn: fetchAvailableItems });
  const cart = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: () => fetchCart(user!.id),
    enabled: Boolean(user),
  });
  const cartItems = cart.data ?? [];

  const requireLogin = () => {
    if (!user) {
      toast("Please log in to continue");
      navigate({ to: "/auth" });
      return true;
    }
    return false;
  };

  const addToCart = useMutation({
    mutationFn: async (item: Item) => {
      const { error } = await supabase.from("cart_items").insert({ user_id: user!.id, item_id: item.id });
      if (error) throw new Error(error.code === "23505" ? "Already in your cart" : error.message);
      return item;
    },
    onSuccess: (item) => {
      toast.success(`${item.name} added to cart`);
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFromCart = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("user_id", user!.id).eq("item_id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const address = profile?.delivery_address?.trim();
      if (!address) throw new Error("Add your delivery address in My account before checking out");
      for (const item of cartItems) {
        const { error } = await supabase
          .from("orders")
          .insert({ buyer_id: user!.id, item_id: item.id, delivery_address: address, seller_id: item.seller_id, item_name: item.name, price: item.price });
        if (error) throw new Error(`${item.name}: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success("Order placed. Track it in My account.");
      setCartOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries();
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader
        cartCount={cartItems.length}
        onCart={() => {
          if (!requireLogin()) setCartOpen(true);
        }}
      />

      <section className="relative">
        <img src={hero} alt="Rail of pre-loved clothing" width={1600} height={912} className="h-[60vh] w-full object-cover" />
        <div className="absolute inset-0 bg-overlay" />
        <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-16 text-primary-foreground">
          <h1 className="max-w-2xl text-5xl leading-tight md:text-6xl">Good clothes deserve a second story.</h1>
          <p className="mt-4 max-w-lg text-lg opacity-90">Buy and sell branded second-hand clothing, checked for quality.</p>
          <div className="mt-8 flex gap-3">
            <Button variant="secondary" asChild><a href="#shop">Browse the rail</a></Button>
            {!user && <Button variant="outline" className="bg-transparent" asChild><Link to="/auth">Create an account</Link></Button>}
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl">Just in</h2>
        {items.isLoading && <p className="mt-6 text-muted-foreground">Loading clothing...</p>}
        {items.data?.length === 0 && <p className="mt-6 text-muted-foreground">No clothing is listed right now. Check back soon.</p>}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.data?.map((item) => {
            const own = item.seller_id === user?.id;
            const inCart = cartItems.some((c) => c.id === item.id);
            return (
              <article key={item.id} className="overflow-hidden rounded-lg bg-card shadow-soft">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center bg-muted text-muted-foreground">No photo</div>
                )}
                <div className="p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.brand}</p>
                  <h3 className="mt-1 text-xl">{item.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Size {item.size} · {item.condition} · by @{item.seller_username}
                  </p>
                  {item.description && <p className="mt-2 text-sm">{item.description}</p>}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold">{formatRand(Number(item.price))}</span>
                    {!own && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => !requireLogin() && setMessageFor(item)}>Message</Button>
                        <Button size="sm" disabled={inCart} onClick={() => !requireLogin() && addToCart.mutate(item)}>
                          {inCart ? "In cart" : "Add"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-4xl">Sell with Pastimes</h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Register as a vendor and upload your identity document. Once our team approves you, submit clothing from My account and we list it after a quality check.
          </p>
          <Button className="mt-6" asChild>
            <Link to={user ? "/account" : "/auth"}>{user ? "Go to My account" : "Become a vendor"}</Link>
          </Button>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-muted-foreground">Pastimes · Second-hand branded clothing</footer>

      {cartOpen && (
        <div className="fixed inset-0 z-30 flex justify-end bg-overlay" onClick={() => setCartOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl">Your cart</h2>
              <Button variant="outline" size="sm" onClick={() => setCartOpen(false)}>Close</Button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {cartItems.length === 0 && <p className="text-muted-foreground">Your cart is empty.</p>}
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="h-20 w-16 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{formatRand(Number(item.price))} · Size {item.size}</p>
                    {item.status !== "available" && <p className="text-sm text-destructive">No longer available</p>}
                  </div>
                  <button className="text-sm text-destructive" onClick={() => removeFromCart.mutate(item.id)}>Remove</button>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatRand(cartTotal(cartItems))}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Deliver to: {profile?.delivery_address || "No address yet. Add one in My account."}
              </p>
              <Button
                variant="accent"
                className="mt-4 w-full"
                disabled={cartItems.length === 0 || checkout.isPending}
                onClick={() => checkout.mutate()}
              >
                {checkout.isPending ? "Placing order..." : "Buy now"}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {messageFor && user && profile && (
        <MessageDialog
          item={messageFor}
          sender={{ id: user.id, username: profile.username }}
          onClose={() => setMessageFor(null)}
        />
      )}
    </div>
  );
}

function MessageDialog({ item, sender, onClose }: { item: Item; sender: { id: string; username: string }; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get("body") ?? "").trim();
    if (!body || body.length > 1000) {
      toast.error("Write a message of up to 1000 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: sender.id,
      sender_username: sender.username,
      recipient_id: item.seller_id,
      recipient_username: item.seller_username,
      item_id: item.id,
      item_name: item.name,
      body,
    });
    setBusy(false);
    if (error) {
      toast.error("Only approved accounts can send messages");
      return;
    }
    toast.success(`Message sent to @${item.seller_username}`);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-overlay p-4" onClick={onClose}>
      <form className="w-full max-w-md space-y-3 rounded-lg bg-background p-6" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="text-2xl">Message @{item.seller_username}</h2>
        <p className="text-sm text-muted-foreground">About: {item.name}</p>
        <Textarea name="body" required rows={4} maxLength={1000} placeholder="Ask about fit, condition..." />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy}>Send</Button>
        </div>
      </form>
    </div>
  );
}
