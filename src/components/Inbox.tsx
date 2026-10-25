import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = Tables<"messages">;

// Lists messages the viewer can see, with a reply box for each one.
export function Inbox({ me, showAll = false }: { me: { id: string; username: string }; showAll?: boolean }) {
  const qc = useQueryClient();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [text, setText] = useState("");

  const messages = useQuery({
    queryKey: ["messages", me.id, showAll],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const reply = async (m: Message) => {
    const body = text.trim();
    if (!body) return;
    const toMe = m.recipient_id === me.id;
    const { error } = await supabase.from("messages").insert({
      sender_id: me.id,
      sender_username: me.username,
      recipient_id: toMe ? m.sender_id : m.recipient_id,
      recipient_username: toMe ? m.sender_username : m.recipient_username,
      item_id: m.item_id,
      item_name: m.item_name,
      body,
    });
    if (error) return toast.error("Could not send the reply");
    toast.success("Reply sent");
    setText("");
    setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  if (messages.isLoading) return <p className="text-muted-foreground">Loading messages...</p>;
  if (!messages.data?.length) return <p className="text-muted-foreground">No messages yet.</p>;

  return (
    <ul className="space-y-3">
      {messages.data.map((m) => (
        <li key={m.id} className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            @{m.sender_username} to @{m.recipient_username}
            {m.item_name ? ` · about ${m.item_name}` : ""} · {new Date(m.created_at).toLocaleString("en-ZA")}
          </p>
          <p className="mt-1">{m.body}</p>
          {(showAll || m.sender_id !== me.id || m.recipient_id !== me.id) && (
            replyTo === m.id ? (
              <div className="mt-3 space-y-2">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reply(m)}>Send reply</Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setReplyTo(m.id)}>Reply</Button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}
