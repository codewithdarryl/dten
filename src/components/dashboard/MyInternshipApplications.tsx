import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { simpleStatus, statusClass, statusLabel } from "@/lib/internshipStatus";

type App = { id: string; track: string; status: string; status_reason: string | null; decided_at: string | null; created_at: string };

const MyInternshipApplications = () => {
  const [apps, setApps] = useState<App[] | null>(null);

  useEffect(() => {
    supabase.from("internship_applications")
      .select("id, track, status, status_reason, decided_at, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setApps((data as App[]) || []));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Briefcase size={16} /> My internship applications</CardTitle>
      </CardHeader>
      <CardContent>
        {apps === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven't applied yet. <Link to="/internships" className="text-primary underline">Apply for an internship</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {apps.map((a) => {
              const s = simpleStatus(a.status);
              return (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.track}</p>
                      <p className="text-xs text-muted-foreground">Applied {new Date(a.created_at).toLocaleDateString()}
                        {a.decided_at && ` · decided ${new Date(a.decided_at).toLocaleDateString()}`}</p>
                    </div>
                    <Badge variant="outline" className={statusClass[s]}>{statusLabel[s]}</Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Reason: </span>
                    {a.status_reason || (s === "pending" ? "Your application is being reviewed." : "No reason given.")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyInternshipApplications;
