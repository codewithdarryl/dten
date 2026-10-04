import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CalendarCourse = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  enrollment_deadline?: string | null;
};

type Ev = { id: string; title: string; kind: "Starts" | "Ends" | "Deadline"; date: string };

const kindStyle: Record<Ev["kind"], string> = {
  Starts: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Ends: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  Deadline: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const CourseCalendar = ({ courses }: { courses: CalendarCourse[] }) => {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const events = useMemo(() => {
    const out: Ev[] = [];
    for (const c of courses) {
      if (c.start_date) out.push({ id: c.id, title: c.title, kind: "Starts", date: c.start_date });
      if (c.end_date) out.push({ id: c.id, title: c.title, kind: "Ends", date: c.end_date });
      if (c.enrollment_deadline) out.push({ id: c.id, title: c.title, kind: "Deadline", date: c.enrollment_deadline });
    }
    return out;
  }, [courses]);

  const byDay = useMemo(() => {
    const map: Record<string, Ev[]> = {};
    for (const e of events) (map[e.date] ||= []).push(e);
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const today = iso(new Date());
    return events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [events]);

  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = firstDay.getDay();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];
  const todayIso = iso(new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays size={16} /> Course calendar
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft size={14} />
          </Button>
          <span className="w-36 text-center text-sm font-medium">
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="min-h-[68px] rounded-md bg-muted/20" />;
            const key = iso(d);
            const dayEvents = byDay[key] || [];
            return (
              <div key={key}
                className={`min-h-[68px] rounded-md border p-1 text-left ${key === todayIso ? "border-primary/60 bg-primary/5" : "border-border/60"}`}>
                <div className="mb-1 text-[10px] font-medium text-muted-foreground">{d.getDate()}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((e, idx) => (
                    <div key={idx} title={`${e.title} — ${e.kind}`}
                      className={`truncate rounded border px-1 py-0.5 text-[9px] ${kindStyle[e.kind]}`}>
                      {e.kind}: {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Upcoming</p>
          {upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground">No upcoming dates. Add start, end or deadline dates to a course.</p>
          ) : (
            <ul className="space-y-1">
              {upcoming.map((e, i) => (
                <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
                  <span className="truncate">{e.title}</span>
                  <span className="ml-2 flex shrink-0 items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${kindStyle[e.kind]}`}>{e.kind}</span>
                    <span className="text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCalendar;
