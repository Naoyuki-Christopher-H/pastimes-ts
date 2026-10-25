import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CONDITIONS, uploadItemImage } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const itemSchema = z.object({
  name: z.string().trim().min(2, "Enter the item name").max(100),
  brand: z.string().trim().min(1, "Enter the brand").max(60),
  size: z.string().trim().min(1, "Enter the size").max(20),
  condition: z.enum(CONDITIONS as [string, ...string[]]),
  price: z.coerce.number().positive("Enter a price above 0").max(100000),
  description: z.string().trim().max(500).optional(),
});

// Vendors submit items for review; admins can publish straight away.
export function ItemForm({
  seller,
  publish,
  onSaved,
}: {
  seller: { id: string; username: string };
  publish: boolean;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const parsed = itemSchema.safeParse(Object.fromEntries(f));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const file = f.get("photo") as File | null;
    if (file && file.size > 5 * 1024 * 1024) return toast.error("Photo must be 5 MB or smaller");

    setBusy(true);
    try {
      const image_url = file && file.size > 0 ? await uploadItemImage(seller.id, file) : null;
      const { error } = await supabase.from("items").insert({
        ...parsed.data,
        description: parsed.data.description || null,
        seller_id: seller.id,
        seller_username: seller.username,
        image_url,
        status: publish ? "available" : "pending",
      });
      if (error) throw error;
      toast.success(publish ? "Item listed in the shop" : "Item submitted for review");
      formEl.reset();
      onSaved();
    } catch {
      toast.error("Could not save the item. Only approved vendors can list clothing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1"><Label htmlFor="it-name">Item name</Label><Input id="it-name" name="name" required /></div>
      <div className="space-y-1"><Label htmlFor="it-brand">Brand</Label><Input id="it-brand" name="brand" required /></div>
      <div className="space-y-1"><Label htmlFor="it-size">Size</Label><Input id="it-size" name="size" required /></div>
      <div className="space-y-1">
        <Label htmlFor="it-condition">Condition</Label>
        <select id="it-condition" name="condition" className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="space-y-1"><Label htmlFor="it-price">Price (R)</Label><Input id="it-price" name="price" type="number" min="1" step="0.01" required /></div>
      <div className="space-y-1"><Label htmlFor="it-photo">Photo</Label><Input id="it-photo" name="photo" type="file" accept="image/*" /></div>
      <div className="space-y-1 sm:col-span-2"><Label htmlFor="it-desc">Description</Label><Textarea id="it-desc" name="description" rows={2} maxLength={500} /></div>
      <Button className="sm:col-span-2" disabled={busy}>{busy ? "Saving..." : publish ? "List item" : "Submit for review"}</Button>
    </form>
  );
}
