import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getWebhookUrl, setWebhookUrl } from "@/lib/webhook";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [webhook, setWebhook] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? user.user_metadata?.display_name ?? ""));
    setWebhook(getWebhookUrl());
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("user_id", user.id);
    setWebhookUrl(webhook.trim());
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile and integrations." />
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Make.com Webhook</h2>
            <p className="text-sm text-muted-foreground mt-1">URL we POST lesson details to when generating a kit.</p>
          </div>
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hook.make.com/..." />
          </div>
        </section>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={async () => { await signOut(); toast.success("Logged out"); navigate({ to: "/" }); }}>Log out</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </div>
  );
}
