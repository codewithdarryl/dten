import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { simpleStatus, statusClass, statusLabel, type SimpleStatus } from "@/lib/internshipStatus";

type App = {
  id: string; full_name: string | null; email: string | null; track: string | null; status: string;
  status_reason: string | null; decided_at: string | null; created_at: string;
};

// simpleStatus() may return something unexpected for odd DB values; never let that break counts/filters.
const toSimple = (s: string | null | undefined): SimpleStatus => {
  const r = simpleStatus(s ?? "") as string;
  return r === "approved" || r === "rejected" ? r : "pending";
};

const AdminInternshipReview = () => {
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | SimpleStatus>("all");
  const [search, setSearch] = useState("");
  const [deciding, setDeciding] = useState<{ app: App; status: SimpleStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("internship_applications")
      .select("id, full_name, email, track, status, status_reason, decided_at, created_at")
      .order("created_at", { ascending: false });
    if (error) setLoadError(error.message);
    else { setApps((data as App[]) || []); setLoadError(null); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-intern-review")
      .on("postgres_changes", { event: "*", schema: "public", table: "internship_applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<SimpleStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    apps.forEach((a) => { c[toSimple(a.status)]++; });
    return c;
  }, [apps]);

  const shown = apps.filter((a) => {
    if (filter !== "all" && toSimple(a.status) !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || [a.full_name, a.email, a.track].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  const open = (app: App, status: SimpleStatus) => {
    setDeciding({ app, status });
    setReason(toSimple(app.status) === status ? app.status_reason || "" : "");
  };

  const close = () => { if (!saving) setDeciding(null); };

  const save = async () => {
    if (!deciding || saving) return;
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
    const patch = {
      status: deciding.status,
      status_reason: trimmed || null,
      decided_at: deciding.status === "pending" ? null : new Date().toISOString(),
    };
    const { error } = await supabase.from("internship_applications").update(patch).eq("id", deciding.app.id);
    setSaving(false);
    if (error) { toast({ title: "Could not update", description: error.message, variant: "destructive" }); return; }
    setApps((prev) => prev.map((a) => (a.id === deciding.app.id ? { ...a, ...patch } : a)));
    toast({ title: `Marked ${statusLabel[deciding.status]}` });
    setDeciding(null);
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
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : loadError ? (
          <div className="py-8 text-center text-sm">
            <p className="text-destructive">Could not load applications: {loadError}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); load(); }}>Try again</Button>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No applications here.</p>
        ) : (
          <div className="space-y-3">
            {shown.map((a) => {
              const s = toSimple(a.status);
              return (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{a.full_name || "Unnamed applicant"}</p>
                      <p className="text-xs text-muted-foreground break-all">
                        {[a.email, a.track].filter(Boolean).join(" · ")} · applied {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusClass[s]}>{statusLabel[s]}</Badge>
                  </div>
                  {a.status_reason && (
                    <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm"><span className="text-muted-foreground">Reason: </span>{a.status_reason}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => open(a, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => open(a, "rejected")}>Reject</Button>
                    {s !== "pending" && <Button size="sm" variant="ghost" onClick={() => open(a, "pending")}>Move to pending</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!deciding} onOpenChange={(o) => !o && close()}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{deciding && `${statusLabel[deciding.status]}: ${deciding.app.full_name || "Applicant"}`}</DialogTitle>
            <DialogDescription className="sr-only">Record a decision on this internship application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision-reason">Reason {deciding?.status === "pending" ? "(optional)" : "(the applicant will see this)"}</Label>
            <Textarea id="decision-reason" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={deciding?.status === "approved" ? "e.g. Strong portfolio — welcome to the Web track." : "e.g. We need more project experience. Please reapply next cohort."} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 size={14} className="mr-1 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminInternshipReview;
