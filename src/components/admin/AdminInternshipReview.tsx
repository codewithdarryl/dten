import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { simpleStatus, statusClass, statusLabel, type SimpleStatus } from "@/lib/internshipStatus";

type App = {
  id: string; full_name: string; email: string; track: string; status: string;
  status_reason: string | null; decided_at: string | null; created_at: string;
};

const AdminInternshipReview = () => {
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | SimpleStatus>("all");
  const [search, setSearch] = useState("");
  const [deciding, setDeciding] = useState<{ app: App; status: SimpleStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("internship_applications")
      .select("id, full_name, email, track, status, status_reason, decided_at, created_at")
      .order("created_at", { ascending: false });
    setApps((data as App[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-intern-review")
      .on("postgres_changes", { event: "*", schema: "public", table: "internship_applications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    apps.forEach((a) => c[simpleStatus(a.status)]++);
    return c;
  }, [apps]);

  const shown = apps.filter((a) => {
    if (filter !== "all" && simpleStatus(a.status) !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.track.toLowerCase().includes(q);
  });

  const open = (app: App, status: SimpleStatus) => {
    setDeciding({ app, status });
    setReason(simpleStatus(app.status) === status ? app.status_reason || "" : "");
  };

  const save = async () => {
    if (!deciding) return;
    const trimmed = reason.trim();
    if (deciding.status !== "pending" && trimmed.length < 3) {
      toast({ title: "Please add a reason", description: "Applicants will see this reason.", variant: "destructive" });
      return;
    }
    if (trimmed.length > 1000) {
      toast({ title: "Reason is too long", description: "Keep it under 1000 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("internship_applications").update({
      status: deciding.status,
      status_reason: trimmed || null,
      decided_at: deciding.status === "pending" ? null : new Date().toISOString(),
    }).eq("id", deciding.app.id);
    setSaving(false);
    if (error) { toast({ title: "Could not update", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Marked ${statusLabel[deciding.status]}` });
    setDeciding(null);
    load();
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-base"><Briefcase size={16} /> Internship applications</CardTitle>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((k) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
              {k === "all" ? `All (${apps.length})` : `${statusLabel[k]} (${counts[k]})`}
            </Button>
          ))}
          <div className="relative ml-auto min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search name, email, track" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
