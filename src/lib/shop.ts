import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Item = Tables<"items">;

export const CONDITIONS = ["Like new", "Excellent", "Good"];

export async function fetchAvailableItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCart(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("item:items(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.item).filter((i): i is Item => Boolean(i));
}

export const cartTotal = (items: Pick<Item, "price">[]) =>
  items.reduce((sum, item) => sum + Number(item.price), 0);

// Uploads a clothing photo to the seller's folder and returns a long-lived link.
export async function uploadItemImage(userId: string, file: File): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^A-Za-z0-9._-]/g, "")}`;
  const { error } = await supabase.storage.from("item-images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage
    .from("item-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (urlError || !data) throw urlError ?? new Error("Could not create image link");
  return data.signedUrl;
}
