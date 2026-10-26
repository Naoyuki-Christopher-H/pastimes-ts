import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Inbox } from "@/components/Inbox";
import { ItemForm } from "@/components/ItemForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRand } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account | Pastimes" },
      { name: "description", content: "Manage your delivery details, orders, messages and listings." },
      { property: "og:title", content: "My account | Pastimes" },
      { property: "og:description", content: "Manage your delivery details, orders, messages and listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setAddress(profile?.delivery_address ?? "");
  }, [profile]);

  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const orders = useQuery({
    queryKey: ["orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const listings = useQuery({
    queryKey: ["my-items", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.from("items").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  if (!user || !profile) return <div className="min-h-screen"><SiteHeader /><p className="p-10">Loading...</p></div>;

  const isVendor = profile.account_type === "vendor" || profile.account_type === "admin";

  const saveDetails = async () => {
    if (name.trim().length < 2) { toast.error("Enter your full name"); return; }
    if (address.length > 500) { toast.error("Address is too long"); return; }
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), delivery_address: address.trim() || null }).eq("id", user.id);
    if (error) { toast.error("Could not save your details"); return; }
    toast.success("Details saved");
    refreshProfile();
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <div>
          <h1 className="text-4xl">Hello, {profile.full_name}</h1>
          <div className="mt-2 text-muted-foreground">
            @{profile.username} · {profile.email} · <Badge variant="secondary">{profile.account_type}</Badge>
          </div>
        </div>

        {announcements.data && announcements.data.length > 0 && (
          <section className="rounded-lg bg-secondary p-5">
            <h2 className="text-xl">News from Pastimes</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {announcements.data.map((a) => <li key={a.id}>{a.body}</li>)}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-2xl">Delivery details</h2>
          <div className="mt-4 grid max-w-xl gap-3">
            <div className="space-y-1"><Label htmlFor="acc-name">Full name</Label><Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1">
              <Label htmlFor="acc-address">Residential or work address for the courier</Label>
              <Textarea id="acc-address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} />
            </div>
            <Button className="w-fit" onClick={saveDetails}>Save details</Button>
          </div>
        </section>

        <section>
          <h2 className="text-2xl">My orders</h2>
          <div className="mt-4 space-y-2">
            {orders.data?.filter((o) => o.buyer_id === user.id).length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {orders.data?.filter((o) => o.buyer_id === user.id).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                <span>{o.item_name} · {formatRand(Number(o.price))}</span>
                <Badge>{o.status}</Badge>
              </div>
            ))}
          </div>
        </section>

        {isVendor && (
          <section>
            <h2 className="text-2xl">Sell an item</h2>
            <p className="mt-1 text-sm text-muted-foreground">Our team checks every item before it appears in the shop.</p>
            <div className="mt-4">
              <ItemForm
                seller={{ id: user.id, username: profile.username }}
                publish={profile.account_type === "admin"}
                onSaved={() => qc.invalidateQueries({ queryKey: ["my-items"] })}
              />
            </div>
            <h3 className="mt-8 text-xl">My listings</h3>
            <div className="mt-3 space-y-2">
              {listings.data?.length === 0 && <p className="text-muted-foreground">No listings yet.</p>}
              {listings.data?.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                  <span>{i.name} · {formatRand(Number(i.price))}</span>
                  <Badge variant={i.status === "available" ? "default" : "secondary"}>{i.status === "pending" ? "awaiting review" : i.status}</Badge>
                </div>
              ))}
            </div>
            <h3 className="mt-8 text-xl">Sales</h3>
            <div className="mt-3 space-y-2">
              {orders.data?.filter((o) => o.seller_id === user.id).length === 0 && <p className="text-muted-foreground">No sales yet.</p>}
              {orders.data?.filter((o) => o.seller_id === user.id).map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                  <span>{o.item_name} · {formatRand(Number(o.price))}</span>
                  <Badge>{o.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl">Messages</h2>
          <div className="mt-4"><Inbox me={{ id: user.id, username: profile.username }} /></div>
        </section>
      </main>
    </div>
  );
}
