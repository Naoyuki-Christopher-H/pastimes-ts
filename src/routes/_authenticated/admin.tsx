import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Inbox } from "@/components/Inbox";
import { ItemForm } from "@/components/ItemForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatRand } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Pastimes" },
      { name: "description", content: "Approve accounts, manage listings, orders and messages." },
      { property: "og:title", content: "Admin | Pastimes" },
      { property: "og:description", content: "Approve accounts, manage listings, orders and messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, profile, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen"><SiteHeader /><p className="p-10">Loading...</p></div>;
  if (!isAdmin || !user || !profile) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="p-10">
          <p>This page is for administrators only.</p>
          <Link to="/" className="text-accent underline">Back to the shop</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl">Admin</h1>
        <Tabs defaultValue="accounts" className="mt-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="announce">Announcements</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts"><Accounts /></TabsContent>
          <TabsContent value="listings"><Listings me={{ id: user.id, username: profile.username }} /></TabsContent>
          <TabsContent value="orders"><Orders /></TabsContent>
          <TabsContent value="messages" className="mt-6"><Inbox me={{ id: user.id, username: profile.username }} showAll /></TabsContent>
          <TabsContent value="announce"><Announcements /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Accounts() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const accounts = useQuery({
    queryKey: ["admin-accounts", filter],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("status", filter).neq("account_type", "admin").order("created_at")).data ?? [],
  });

  const openDocument = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (error || !data) { toast.error("Could not open the document"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ status, review_note: notes[id]?.trim() || null }).eq("id", id);
    if (error) { toast.error("Could not update the account"); return; }
    toast.success(status === "approved" ? "Account approved" : "Account rejected");
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      {accounts.data?.length === 0 && <p className="text-muted-foreground">No {filter} accounts.</p>}
      {accounts.data?.map((a) => (
        <div key={a.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{a.full_name} <span className="text-muted-foreground">@{a.username}</span></p>
              <p className="text-sm text-muted-foreground">{a.email} · registered {new Date(a.created_at).toLocaleDateString("en-ZA")}</p>
            </div>
            <Badge variant="secondary">{a.account_type}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {a.document_path ? (
              <Button size="sm" variant="outline" onClick={() => openDocument(a.document_path!)}>Review document</Button>
            ) : (
              <span className="text-sm text-destructive">No document uploaded</span>
            )}
            {a.review_note && <span className="text-sm text-muted-foreground">Note: {a.review_note}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              placeholder="Note to the user (optional)"
              className="max-w-sm"
              value={notes[a.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
              maxLength={300}
            />
            {a.status !== "approved" && <Button size="sm" onClick={() => decide(a.id, "approved")}>Approve</Button>}
            {a.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => decide(a.id, "rejected")}>Reject</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Listings({ me }: { me: { id: string; username: string } }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["admin-items"],
    queryFn: async () => (await supabase.from("items").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries();

  const setStatus = async (id: string, status: "available" | "sold" | "pending") => {
    const { error } = await supabase.from("items").update({ status }).eq("id", id);
    if (error) { toast.error("Could not update the item"); return; }
    refresh();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Remove this item from the store?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) { toast.error("Items with orders cannot be deleted. Mark them as sold instead."); return; }
    toast.success("Item removed");
    refresh();
  };

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-xl">Add an item</h2>
        <div className="mt-4"><ItemForm seller={me} publish onSaved={refresh} /></div>
      </section>
      <section className="space-y-2">
        {items.data?.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {i.image_url && <img src={i.image_url} alt={i.name} className="h-14 w-12 rounded object-cover" />}
              <div>
                <p className="font-medium">{i.name} · {formatRand(Number(i.price))}</p>
                <p className="text-sm text-muted-foreground">{i.brand} · Size {i.size} · {i.condition} · @{i.seller_username}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={i.status === "available" ? "default" : "secondary"}>{i.status}</Badge>
              {i.status === "pending" && <Button size="sm" onClick={() => setStatus(i.id, "available")}>Approve</Button>}
              {i.status === "available" && <Button size="sm" variant="outline" onClick={() => setStatus(i.id, "sold")}>Mark sold</Button>}
              <Button size="sm" variant="destructive" onClick={() => remove(i.id)}>Remove</Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const update = async (id: string, status: "placed" | "shipped" | "delivered") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error("Could not update the order"); return; }
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  return (
    <div className="mt-6 space-y-2">
      {orders.data?.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      {orders.data?.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div>
            <p className="font-medium">{o.item_name} · {formatRand(Number(o.price))}</p>
            <p className="text-sm text-muted-foreground">Deliver to: {o.delivery_address}</p>
            <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-ZA")}</p>
          </div>
          <div className="flex gap-2">
            {(["placed", "shipped", "delivered"] as const).map((s) => (
              <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} onClick={() => update(o.id, s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Announcements() {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const post = async () => {
    if (!body.trim()) return;
    const { error } = await supabase.from("announcements").insert({ body: body.trim() });
    if (error) { toast.error("Could not post the announcement"); return; }
    setBody("");
    toast.success("Announcement sent to all users");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };
  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };
  return (
    <div className="mt-6 max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">Announcements appear on every user's account page, for example new stock or delivery updates.</p>
      <Textarea rows={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write to all buyers and sellers..." />
      <Button onClick={post}>Post announcement</Button>
      {list.data?.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p>{a.body}</p>
          <Button size="sm" variant="outline" onClick={() => remove(a.id)}>Delete</Button>
        </div>
      ))}
    </div>
  );
}
