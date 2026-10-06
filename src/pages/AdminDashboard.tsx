import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Mail, Calendar, GraduationCap, Award, FileText, Loader2, Bell, Upload,
  Search, UserPlus, BookOpen, Newspaper, Settings, ClipboardList, CheckCircle, XCircle,
  Download, Users, Shield, Trash2, Star, Sparkles, Briefcase, Handshake, Power, PowerOff,
  Pencil, KeyRound, Copy, MoreHorizontal, AlertTriangle, Inbox, Plus, Clock, ExternalLink,
  Library, FileSpreadsheet, X,
} from "lucide-react";
import AdminInternshipReview from "@/components/admin/AdminInternshipReview";
import AdminExports from "@/components/admin/AdminExports";
import AdminPartnershipsManager from "@/components/admin/AdminPartnershipsManager";
import AdminCourseCMS from "@/components/admin/AdminCourseCMS";
import AdminCoursesManager from "@/components/admin/AdminCoursesManager";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";
import AdminAIAssetsManager from "@/components/admin/AdminAIAssetsManager";
import JaelFeedbackViewer from "@/components/admin/JaelFeedbackViewer";
import AdminPartnerLogoManager from "@/components/admin/AdminPartnerLogoManager";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// Needs: npx shadcn@latest add dropdown-menu
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { invokeFn } from "@/lib/functions";
import { getSessionOnce } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

/* -------------------------------------------------------------------------- */
/*  Constants & helpers                                                       */
/* -------------------------------------------------------------------------- */

const COURSES = [
  "Web Development", "Data Science", "Cybersecurity", "Mobile App Development",
  "AI & Machine Learning", "Cloud Computing", "UI/UX Design", "Digital Marketing",
];

type View =
  | "overview" | "students" | "tasks" | "staff" | "admins" | "contacts" | "bookings"
  | "certificates" | "offers" | "courses" | "cms" | "internships" | "partnerships"
  | "exports" | "jael";

const VIEW_META: Record<View, { title: string; description: string }> = {
  overview: { title: "Overview", description: "What needs your attention today." },
  students: { title: "Students", description: "Enrolments, accounts and status." },
  tasks: { title: "Tasks", description: "Assign work, review submissions and grade." },
  staff: { title: "Staff", description: "Staff accounts and access." },
  admins: { title: "Admins", description: "People who can manage this dashboard." },
  contacts: { title: "Contact messages", description: "Messages sent through the website." },
  bookings: { title: "Bookings", description: "Consultation and service requests." },
  certificates: { title: "Certificates", description: "Certificates issued to students." },
  offers: { title: "Offer letters", description: "Internship offers uploaded for students." },
  courses: { title: "Courses", description: "Course catalogue and content." },
  cms: { title: "Course CMS", description: "Edit lessons, modules and resources." },
  internships: { title: "Internships", description: "Review internship applications." },
  partnerships: { title: "Partnerships", description: "Partner requests and records." },
  exports: { title: "Exports & reports", description: "Download data for reporting." },
  jael: { title: "Jael AI", description: "Assistant assets, partner logos and feedback." },
};

const isView = (v: string): v is View => v in VIEW_META;

const getLetterGrade = (s: number) => (s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F");

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

const timeAgo = (d: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};

const TONES: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  red: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20",
  grey: "bg-muted text-muted-foreground ring-border",
};
const STATUS_TONE: Record<string, string> = {
  active: "green", approved: "green", completed: "violet", pending: "amber",
  assigned: "blue", rejected: "red", inactive: "grey",
};

function Pill({ tone, children }: { tone?: string; children: ReactNode }) {
  const key = tone ?? STATUS_TONE[String(children).toLowerCase()] ?? "grey";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[key]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="capitalize">{children}</span>
    </span>
  );
}

function Initials({ name, className = "" }: { name?: string; className?: string }) {
  const text = (name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ${className}`}>
      {text}
    </span>
  );
}

function PersonCell({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Initials name={name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight">{name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: any; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon size={20} /></div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

function DataTable<T extends { id?: string }>({
  rows, columns, loading, empty,
}: { rows: T[]; columns: Column<T>[]; loading?: boolean; empty: ReactNode }) {
  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />)}
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map(c => <TableHead key={c.header} className={`h-10 whitespace-nowrap text-xs font-medium text-muted-foreground ${c.className ?? ""}`}>{c.header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id ?? i}>
              {columns.map(c => <TableCell key={c.header} className={`py-3 ${c.className ?? ""}`}>{c.cell(r)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type MenuAction = { label: string; icon: any; onClick: () => void; danger?: boolean; separatorBefore?: boolean };

function RowMenu({ actions, label = "Actions" }: { actions: MenuAction[]; label?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={label}><MoreHorizontal size={16} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{label}</DropdownMenuLabel>
        {actions.map(a => (
          <div key={a.label}>
            {a.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={a.onClick} className={a.danger ? "text-destructive focus:text-destructive" : ""}>
              <a.icon size={14} className="mr-2" /> {a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FilterChips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {options.map(o => (
        <button
          key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label}{o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Task card (owns its own grading state)                                    */
/* -------------------------------------------------------------------------- */

function TaskCard({
  task, onReview, onDownload,
}: {
  task: any;
  onReview: (id: string, status: "approved" | "rejected", score: number | null, feedback: string) => Promise<void>;
  onDownload: (path: string) => void;
}) {
  const { toast } = useToast();
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"" | "ai" | "approved" | "rejected">("");
  const parsed = score === "" ? null : Math.min(100, Math.max(0, parseInt(score)));
  const overdue = task.due_date && task.status !== "approved" && new Date(task.due_date) < new Date();

  const suggest = async () => {
    setBusy("ai");
    try {
      const { data, error } = await supabase.functions.invoke("ai-feedback", {
        body: { task_title: task.task_title, course: task.course, description: task.description, student_name: task.student_name, grade_score: parsed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.feedback) setFeedback(data.feedback);
    } catch (err: any) {
      toast({ title: "Couldn't generate feedback", description: err.message, variant: "destructive" });
    } finally { setBusy(""); }
  };

  const review = async (s: "approved" | "rejected") => {
    setBusy(s);
    await onReview(task.id, s, parsed !== null && !isNaN(parsed) ? parsed : null, feedback);
    setBusy("");
  };

  const hasFile = task.file_url && task.file_url !== "pending";

  return (
    <article className={`rounded-xl border bg-card p-4 sm:p-5 ${task.status === "pending" ? "border-amber-500/40" : "border-border"}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{task.task_title}</h4>
            <Pill>{task.status}</Pill>
            {task.grade_letter && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30">
                <Star size={11} /> {task.grade_letter} · {task.grade_score}%
              </span>
            )}
          </div>
          <PersonCell name={task.student_name} sub={`${task.course} · ${task.enrollment_id}`} />
          {task.description && <p className="max-w-prose text-sm text-muted-foreground">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {hasFile && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => onDownload(task.file_url)}>
                <Download size={13} className="mr-1.5" /> {task.file_name}
              </Button>
            )}
            {hasFile && <span className="text-muted-foreground">Submitted {timeAgo(task.created_at)}</span>}
            {task.status === "assigned" && <span className="text-blue-600 dark:text-blue-400">Waiting for the student to submit</span>}
            {task.due_date && (
              <span className={`inline-flex items-center gap-1 font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                <Clock size={12} /> {overdue ? "Overdue · " : "Due "}{fmtDate(task.due_date)}
              </span>
            )}
          </div>
          {task.status !== "pending" && task.status !== "assigned" && task.admin_feedback && (
            <div className="rounded-lg bg-muted/60 p-3 text-sm"><span className="font-medium">Feedback: </span>{task.admin_feedback}</div>
          )}
        </div>

        {task.status === "pending" && (
          <div className="w-full space-y-3 rounded-lg bg-muted/40 p-3 lg:w-72">
            <div className="flex items-end gap-3">
              <Field label="Score (0–100)">
                <Input type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)} className="h-9 w-24" />
              </Field>
              {parsed !== null && !isNaN(parsed) && (
                <p className="pb-2 text-sm font-semibold text-primary">Grade {getLetterGrade(parsed)}</p>
              )}
            </div>
            <Textarea placeholder="Feedback for the student (optional)" className="h-20 text-sm" value={feedback} onChange={e => setFeedback(e.target.value)} />
            <Button variant="ghost" size="sm" className="h-8 w-full justify-start text-xs" disabled={busy === "ai"} onClick={suggest}>
              {busy === "ai" ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Sparkles size={13} className="mr-1.5" />}
              Draft feedback with AI
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" disabled={!!busy} onClick={() => review("approved")}>
                {busy === "approved" ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <CheckCircle size={13} className="mr-1.5" />} Approve
              </Button>
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={!!busy} onClick={() => review("rejected")}>
                {busy === "rejected" ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <XCircle size={13} className="mr-1.5" />} Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [view, setView] = useState<View>(() => {
    const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    return isView(h) ? h : "overview";
  });
  const [query, setQuery] = useState("");

  const go = useCallback((v: View) => {
    setView(v);
    setQuery("");
    window.history.replaceState(null, "", `#${v}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onHash = () => { const h = window.location.hash.replace("#", ""); if (isView(h)) setView(h); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Auth
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Data
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [adminList, setAdminList] = useState<any[]>([]);

  // Filters
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "assigned" | "approved" | "rejected">("pending");
  const [studentStatus, setStudentStatus] = useState("all");

  // Dialogs & forms
  const [dialog, setDialog] = useState<"" | "add-student" | "add-staff" | "assign-task" | "upload-offer">("");
  const [addStudentForm, setAddStudentForm] = useState({ fullName: "", email: "", phone: "", course: "", createAccount: true });
  const [addingStudent, setAddingStudent] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [tempCreds, setTempCreds] = useState<{ email: string; password: string } | null>(null);
  const [staffForm, setStaffForm] = useState({ fullName: "", email: "", department: "", password: "" });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [assignForm, setAssignForm] = useState({ enrollmentId: "", taskTitle: "", description: "", dueDate: "" });
  const [assignStudent, setAssignStudent] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);
  const [offerForm, setOfferForm] = useState({ enrollmentId: "", description: "" });
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [offerStudent, setOfferStudent] = useState<any>(null);
  const [uploadingOffer, setUploadingOffer] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; body: string; label: string; run: () => Promise<void> } | null>(null);
  const [confirming, setConfirming] = useState(false);

  /* ----------------------------- auth + realtime ---------------------------- */

  useEffect(() => {
    (async () => {
      const { data: { session } } = await getSessionOnce();
      if (!session) { navigate("/auth"); return; }
      const { data: roleData } = await supabase.from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!roleData) { setIsAdmin(false); return; }
      setIsAdmin(true);
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      setAdminProfile({ ...profile, email: session.user.email });
    })();
  }, [navigate]);

  const adminData = async (table: string, extra: object = {}) =>
    (await supabase.functions.invoke("admin-data", { body: { table, ...extra } })).data;

  const fetchContacts = async () => { const d = await adminData("contact_submissions"); if (d) setContacts(d); };
  const fetchBookings = async () => { const d = await adminData("booking_submissions"); if (d) setBookings(d); };
  const fetchEnrollments = async () => { const d = await adminData("enrollments"); if (d) setEnrollments(d); };
  const fetchCertificates = async () => { const d = await adminData("certificates"); if (d) setCertificates(d); };
  const fetchOffers = async () => { const d = await adminData("internship_offers"); if (d) setOffers(d); };
  const fetchSubscribers = async () => { const d = await adminData("newsletter_subscribers", { count: true }); if (d) setSubscribers(typeof d === "number" ? d : Array.isArray(d) ? d.length : 0); };
  const fetchTaskSubmissions = async () => { const d = await adminData("task_submissions"); if (d) setTaskSubmissions(d); };
  const fetchNotifications = async () => {
    const { data } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setNotifications(data);
  };
  const fetchStaff = async () => {
    const { data } = await supabase.functions.invoke("manage-staff", { body: { action: "list_staff" } });
    if (data) setStaffList(Array.isArray(data) ? data : []);
  };
  const fetchAdmins = async () => {
    const { data } = await supabase.functions.invoke("manage-staff", { body: { action: "list_admins" } });
    if (data) setAdminList(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      fetchContacts(), fetchBookings(), fetchEnrollments(), fetchCertificates(), fetchOffers(),
      fetchSubscribers(), fetchTaskSubmissions(), fetchNotifications(), fetchStaff(), fetchAdmins(),
    ]).finally(() => setLoading(false));

    const sub = (name: string, table: string, event: "*" | "INSERT", fn: () => void) =>
      supabase.channel(name).on("postgres_changes", { event, schema: "public", table }, fn).subscribe();
    const channels = [
      sub("admin-contacts", "contact_submissions", "*", fetchContacts),
      sub("admin-bookings", "booking_submissions", "*", fetchBookings),
      sub("admin-enrollments", "enrollments", "*", fetchEnrollments),
      sub("admin-notifs", "admin_notifications", "INSERT", fetchNotifications),
      sub("admin-tasks", "task_submissions", "*", fetchTaskSubmissions),
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* -------------------------------- actions -------------------------------- */

  const fail = (title: string) => (err: any) => toast({ title, description: err?.message, variant: "destructive" });

  const markNotificationRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };
  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (!unread.length) return;
    await supabase.from("admin_notifications").update({ read: true }).in("id", unread);
    fetchNotifications();
  };

  const lookup = async (id: string, set: (s: any) => void) => {
    const clean = id.trim().toUpperCase();
    if (!clean) return;
    const { data } = await supabase.from("enrollments").select("*").eq("enrollment_id", clean).maybeSingle();
    set(data || null);
    if (!data) toast({ title: "No student with that ID", description: "Check the enrolment ID and try again.", variant: "destructive" });
  };

  const handleAddStudent = async () => {
    const { fullName, email, phone, course, createAccount } = addStudentForm;
    if (!fullName || !email || !course) { toast({ title: "Name, email and course are required", variant: "destructive" }); return; }
    setAddingStudent(true);
    try {
      const data = await invokeFn("manage-students", { action: "create_student", full_name: fullName, email, phone: phone || null, course, create_account: createAccount });
      toast({ title: "Student added", description: `Enrolment ID: ${data.enrollment.enrollment_id}` });
      if (data.temporary_password) setTempCreds({ email, password: data.temporary_password });
      setAddStudentForm({ fullName: "", email: "", phone: "", course: "", createAccount: true });
      setDialog("");
      fetchEnrollments();
    } catch (err) { fail("Couldn't add student")(err); } finally { setAddingStudent(false); }
  };

  const handleSaveStudent = async () => {
    if (!editStudent) return;
    setSavingStudent(true);
    try {
      await invokeFn("manage-students", {
        action: "update_student", enrollment_id: editStudent.enrollment_id, full_name: editStudent.full_name,
        email: editStudent.email, phone: editStudent.phone, course: editStudent.course, status: editStudent.status,
      });
      toast({ title: "Student updated" });
      setEditStudent(null);
      fetchEnrollments();
    } catch (err) { fail("Couldn't update student")(err); } finally { setSavingStudent(false); }
  };

  const resetPassword = async (fn: "manage-students" | "manage-staff", body: object) => {
    try {
      const data = await invokeFn(fn, body);
      setTempCreds({ email: data.email, password: data.temporary_password });
    } catch (err) { fail("Couldn't reset password")(err); }
  };

  const setStudentStatusFn = async (id: string, status: "Active" | "Inactive") => {
    try {
      await invokeFn("manage-students", { action: "set_status", enrollment_id: id, status });
      toast({ title: status === "Active" ? "Student reactivated" : "Student deactivated" });
      fetchEnrollments();
    } catch (err) { fail("Couldn't change status")(err); }
  };

  const setStaffStatus = async (id: string, status: "active" | "inactive") => {
    try {
      await invokeFn("manage-staff", { action: "set_staff_status", staff_id: id, status });
      toast({ title: status === "active" ? "Staff reactivated" : "Staff deactivated" });
      fetchStaff();
    } catch (err) { fail("Couldn't change status")(err); }
  };

  const askConfirm = (c: NonNullable<typeof confirm>) => setConfirm(c);

  const deleteStudent = (id: string, name: string) => askConfirm({
    title: `Delete ${name}?`,
    body: `This permanently removes ${id}, their login account and all their data. This can't be undone.`,
    label: "Delete student",
    run: async () => {
      await invokeFn("manage-students", { action: "delete_student", enrollment_id: id, delete_account: true });
      toast({ title: "Student deleted" });
      fetchEnrollments();
    },
  });

  const removeStaff = (id: string, name: string) => askConfirm({
    title: `Remove ${name}?`,
    body: `This permanently removes ${id} and deletes their account. This can't be undone.`,
    label: "Remove staff",
    run: async () => { await invokeFn("manage-staff", { action: "remove_staff", staff_id: id }); toast({ title: "Staff removed" }); fetchStaff(); },
  });

  const removeAdmin = (userId: string, email: string) => askConfirm({
    title: `Remove admin access for ${email}?`,
    body: "They will no longer be able to open this dashboard.",
    label: "Remove admin",
    run: async () => {
      const { data, error } = await supabase.functions.invoke("manage-staff", { body: { action: "remove_admin", user_id: userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Admin removed" });
      fetchAdmins();
    },
  });

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirming(true);
    try { await confirm.run(); setConfirm(null); } catch (err) { fail("Something went wrong")(err); } finally { setConfirming(false); }
  };

  const handleCreateStaff = async () => {
    const { fullName, email, department, password } = staffForm;
    if (!fullName || !email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    if (password && password.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return; }
    setCreatingStaff(true);
    try {
      const data = await invokeFn("manage-staff", { action: "create_staff", full_name: fullName, email, department, password: password || undefined });
      toast({ title: "Staff account created", description: `Staff ID: ${data.staff_id}` });
      if (data.temporary_password) setTempCreds({ email, password: data.temporary_password });
      setStaffForm({ fullName: "", email: "", department: "", password: "" });
      setDialog("");
      fetchStaff();
    } catch (err) { fail("Couldn't create staff")(err); } finally { setCreatingStaff(false); }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    setAddingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", { body: { action: "create_admin", email: newAdminEmail } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Admin added", description: `${newAdminEmail} can now manage the dashboard.` });
      setNewAdminEmail("");
      fetchAdmins();
    } catch (err) { fail("Couldn't add admin")(err); } finally { setAddingAdmin(false); }
  };

  const reviewTask = async (taskId: string, status: "approved" | "rejected", score: number | null, feedback: string) => {
    try {
      const update: any = { status, admin_feedback: feedback || null, reviewed_at: new Date().toISOString() };
      if (score !== null) { update.grade_score = score; update.grade_letter = getLetterGrade(score); }
      const { error } = await supabase.from("task_submissions").update(update).eq("id", taskId);
      if (error) throw error;
      toast({ title: status === "approved" ? "Task approved" : "Task rejected", description: score !== null ? `Grade ${getLetterGrade(score)} (${score}%)` : undefined });
      fetchTaskSubmissions();
    } catch (err) { fail("Couldn't save review")(err); }
  };

  const downloadTaskFile = async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("get-signed-url", { body: { bucket: "task-submissions", path } });
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err) { fail("Download failed")(err); }
  };

  const handleAssignTask = async () => {
    if (!assignStudent || !assignForm.taskTitle) { toast({ title: "Find a student and add a task title", variant: "destructive" }); return; }
    setAssigning(true);
    try {
      const row: any = {
        enrollment_id: assignStudent.enrollment_id, student_name: assignStudent.full_name, student_email: assignStudent.email,
        course: assignStudent.course, task_title: assignForm.taskTitle, description: assignForm.description || null,
        file_url: "pending", file_name: "awaiting submission", status: "assigned",
      };
      if (assignForm.dueDate) row.due_date = assignForm.dueDate;
      const { error } = await supabase.from("task_submissions").insert(row);
      if (error) throw error;
      try {
        await supabase.functions.invoke("send-notification", {
          body: { type: "task_assigned", data: { student_name: assignStudent.full_name, task_title: assignForm.taskTitle, course: assignStudent.course, due_date: assignForm.dueDate || "No deadline" } },
        });
      } catch { /* notification is best-effort */ }
      toast({ title: "Task assigned", description: `"${assignForm.taskTitle}" → ${assignStudent.full_name}` });
      setAssignForm({ enrollmentId: "", taskTitle: "", description: "", dueDate: "" });
      setAssignStudent(null);
      setDialog("");
      fetchTaskSubmissions();
    } catch (err) { fail("Couldn't assign task")(err); } finally { setAssigning(false); }
  };

  const uploadOfferLetter = async () => {
    if (!offerFile || !offerStudent) return;
    setUploadingOffer(true);
    try {
      const ext = offerFile.name.split(".").pop();
      const path = `${offerStudent.enrollment_id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("offer-letters").upload(path, offerFile);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("internship_offers").insert({
        enrollment_id: offerStudent.enrollment_id, student_name: offerStudent.full_name, course: offerStudent.course,
        file_url: path, file_name: offerFile.name, description: offerForm.description || null,
      });
      if (dbErr) throw dbErr;
      toast({ title: "Offer letter uploaded" });
      setOfferFile(null); setOfferForm({ enrollmentId: "", description: "" }); setOfferStudent(null); setDialog("");
      fetchOffers();
    } catch (err) { fail("Upload failed")(err); } finally { setUploadingOffer(false); }
  };

  /* -------------------------------- derived -------------------------------- */

  const q = query.trim().toLowerCase();
  const match = (...vals: any[]) => !q || vals.some(v => String(v ?? "").toLowerCase().includes(q));

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingTasks = taskSubmissions.filter(t => t.status === "pending");
  const overdueTasks = taskSubmissions.filter(t => t.status === "assigned" && t.due_date && new Date(t.due_date) < new Date());
  const weekAgo = Date.now() - 7 * 864e5;
  const newContacts = contacts.filter(c => new Date(c.created_at).getTime() > weekAgo);

  const filteredStudents = enrollments.filter(e =>
    (studentStatus === "all" || e.status === studentStatus) && match(e.enrollment_id, e.full_name, e.email, e.course));
  const filteredTasks = taskSubmissions.filter(t =>
    (taskFilter === "all" || t.status === taskFilter) && match(t.task_title, t.student_name, t.enrollment_id, t.course));

  const courseDistribution = useMemo(() => COURSES
    .map(c => ({ name: c, count: enrollments.filter(e => e.course === c).length }))
    .filter(c => c.count > 0).sort((a, b) => b.count - a.count), [enrollments]);

  const taskStatusData = ["Pending", "Approved", "Rejected", "Assigned"].map(n => ({
    name: n, value: taskSubmissions.filter(t => t.status === n.toLowerCase()).length,
  }));

  const enrollmentTrend = useMemo(() => {
    const months: Record<string, number> = {};
    enrollments.forEach(e => {
      const d = new Date(e.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[k] = (months[k] || 0) + 1;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([m, count]) => ({ month: m.slice(5), count }));
  }, [enrollments]);

  const recentActivity = [
    ...contacts.slice(0, 4).map(c => ({ icon: Mail, text: `${c.name} sent a message`, time: c.created_at, to: "contacts" as View })),
    ...bookings.slice(0, 4).map(b => ({ icon: Calendar, text: `${b.name} booked ${b.service}`, time: b.created_at, to: "bookings" as View })),
    ...enrollments.slice(0, 4).map(e => ({ icon: GraduationCap, text: `${e.full_name} enrolled in ${e.course}`, time: e.created_at, to: "students" as View })),
    ...taskSubmissions.filter(t => t.file_url !== "pending").slice(0, 4).map(t => ({ icon: ClipboardList, text: `${t.student_name} submitted "${t.task_title}"`, time: t.created_at, to: "tasks" as View })),
  ].sort((a, b) => +new Date(b.time) - +new Date(a.time)).slice(0, 7);

  const avatarUrl = adminProfile?.avatar_url ? supabase.storage.from("avatars").getPublicUrl(adminProfile.avatar_url).data.publicUrl : undefined;
  const adminName = adminProfile?.display_name || "Admin";

  /* --------------------------------- sidebar -------------------------------- */

  const item = (label: string, v: View, icon: ReactNode) => ({
    label, path: `/admin/dashboard#${v}`, icon, onClick: () => go(v),
  });
  const sidebarGroups = [
    { label: "Dashboard", items: [item("Overview", "overview", <LayoutDashboard size={18} />)] },
    {
      label: "People",
      items: [item("Students", "students", <GraduationCap size={18} />), item("Staff", "staff", <Users size={18} />), item("Admins", "admins", <Shield size={18} />)],
    },
    {
      label: "Learning",
      items: [
        item("Tasks", "tasks", <ClipboardList size={18} />), item("Courses", "courses", <BookOpen size={18} />),
        item("Course CMS", "cms", <Library size={18} />), item("Internships", "internships", <Briefcase size={18} />),
        item("Offer letters", "offers", <FileText size={18} />),
        { label: "Certificates", path: "/admin/certificates", icon: <Award size={18} /> },
      ],
    },
    { label: "Inbox", items: [item("Contacts", "contacts", <Mail size={18} />), item("Bookings", "bookings", <Calendar size={18} />)] },
    {
      label: "Platform",
      items: [
        item("Jael AI", "jael", <Sparkles size={18} />), item("Partnerships", "partnerships", <Handshake size={18} />),
        item("Exports & reports", "exports", <FileSpreadsheet size={18} />),
        { label: "Blog admin", path: "/blog/admin", icon: <Newspaper size={18} /> },
        { label: "Settings", path: "/profile/settings", icon: <Settings size={18} /> },
      ],
    },
  ];

  if (isAdmin === null) {
    return (
      <DashboardSidebar groups={sidebarGroups}>
        <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      </DashboardSidebar>
    );
  }
  if (isAdmin === false) {
    return (
      <DashboardSidebar groups={sidebarGroups}>
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <Shield className="mb-4 text-muted-foreground" size={32} />
          <h2 className="text-xl font-semibold">You don't have access to this page</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ask a main admin to add your account as an admin.</p>
          <Button className="mt-5" variant="outline" asChild><Link to="/">Back to site</Link></Button>
        </div>
      </DashboardSidebar>
    );
  }

  /* --------------------------------- views --------------------------------- */

  const searchable: View[] = ["students", "tasks", "staff", "contacts", "bookings", "certificates", "offers"];
  const meta = VIEW_META[view];

  const headerAction: Partial<Record<View, ReactNode>> = {
    students: <Button onClick={() => setDialog("add-student")}><UserPlus size={15} className="mr-1.5" /> Add student</Button>,
    tasks: <Button onClick={() => setDialog("assign-task")}><Plus size={15} className="mr-1.5" /> Assign task</Button>,
    staff: <Button onClick={() => setDialog("add-staff")}><UserPlus size={15} className="mr-1.5" /> Add staff</Button>,
    offers: <Button onClick={() => setDialog("upload-offer")}><Upload size={15} className="mr-1.5" /> Upload offer letter</Button>,
    certificates: <Button asChild><Link to="/admin/certificates"><Award size={15} className="mr-1.5" /> Issue certificate</Link></Button>,
  };

  const attention = [
    { n: pendingTasks.length, label: "submissions waiting for review", cta: "Review", icon: ClipboardList, tone: "amber", go: () => { setTaskFilter("pending"); go("tasks"); } },
    { n: overdueTasks.length, label: "assigned tasks past their due date", cta: "View", icon: AlertTriangle, tone: "red", go: () => { setTaskFilter("assigned"); go("tasks"); } },
    { n: newContacts.length, label: "new messages this week", cta: "Read", icon: Mail, tone: "blue", go: () => go("contacts") },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <Panel title="Needs your attention">
        {attention.every(a => a.n === 0) ? (
          <EmptyState icon={CheckCircle} title="You're all caught up" hint="New submissions, overdue tasks and messages will show up here." />
        ) : (
          <ul className="divide-y divide-border">
            {attention.filter(a => a.n > 0).map(a => (
              <li key={a.label} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONES[a.tone]} ring-1 ring-inset`}><a.icon size={17} /></span>
                <p className="flex-1 text-sm"><span className="mr-1.5 text-lg font-semibold tabular-nums">{a.n}</span>{a.label}</p>
                <Button size="sm" variant="outline" onClick={a.go}>{a.cta}</Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">
        {[
          { label: "Students", value: enrollments.length, to: "students" as View },
          { label: "Staff", value: staffList.length, to: "staff" as View },
          { label: "Bookings", value: bookings.length, to: "bookings" as View },
          { label: "Certificates", value: certificates.length, to: "certificates" as View },
          { label: "Subscribers", value: subscribers, to: "exports" as View },
        ].map(k => (
          <button key={k.label} onClick={() => go(k.to)} className="bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <dt className="text-xs text-muted-foreground">{k.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{loading ? "–" : k.value.toLocaleString()}</dd>
          </button>
        ))}
      </dl>

      <AnalyticsCharts courseDistribution={courseDistribution} taskStatusData={taskStatusData} enrollmentTrend={enrollmentTrend} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Recent activity" className="lg:col-span-3">
          {recentActivity.length === 0 ? (
            <EmptyState icon={Inbox} title="No activity yet" hint="Enrolments, bookings and submissions will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((a, i) => (
                <li key={i}>
                  <button onClick={() => go(a.to)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:px-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><a.icon size={15} /></span>
                    <span className="min-w-0 flex-1 truncate text-sm">{a.text}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.time)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Students by course" className="lg:col-span-2">
          {courseDistribution.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No enrolments yet" action={<Button size="sm" onClick={() => setDialog("add-student")}>Add the first student</Button>} />
          ) : (
            <ul className="space-y-4 p-4 sm:p-5">
              {courseDistribution.map(c => (
                <li key={c.name}>
                  <div className="mb-1.5 flex justify-between text-sm"><span className="truncate pr-2">{c.name}</span><span className="tabular-nums text-muted-foreground">{c.count}</span></div>
                  <Progress value={(c.count / enrollments.length) * 100} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );

  const renderStudents = () => (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <FilterChips value={studentStatus} onChange={setStudentStatus} options={[
          { value: "all", label: "All", count: enrollments.length },
          ...["Active", "Inactive", "Completed"].map(s => ({ value: s, label: s, count: enrollments.filter(e => e.status === s).length })),
        ]} />
        <p className="text-xs text-muted-foreground">{filteredStudents.length} shown</p>
      </div>
      <DataTable
        rows={filteredStudents} loading={loading}
        empty={<EmptyState icon={GraduationCap} title={q ? "No students match your search" : "No students yet"} hint={q ? "Try a name, email or enrolment ID." : "Add a student to generate their enrolment ID."} action={!q && <Button size="sm" onClick={() => setDialog("add-student")}>Add student</Button>} />}
        columns={[
          { header: "Student", cell: e => <PersonCell name={e.full_name} sub={e.email} /> },
          { header: "Enrolment ID", cell: e => <span className="font-mono text-xs">{e.enrollment_id}</span> },
          { header: "Course", cell: e => <span className="text-sm">{e.course}</span> },
          { header: "Status", cell: e => <Pill>{e.status}</Pill> },
          { header: "Joined", cell: e => <span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span> },
          {
            header: "", className: "w-12 text-right", cell: e => (
              <RowMenu label={e.full_name} actions={[
                { label: "Edit details", icon: Pencil, onClick: () => setEditStudent({ ...e }) },
                { label: "Generate temporary password", icon: KeyRound, onClick: () => resetPassword("manage-students", { action: "reset_student_password", enrollment_id: e.enrollment_id }) },
                e.status === "Active"
                  ? { label: "Deactivate", icon: PowerOff, onClick: () => setStudentStatusFn(e.enrollment_id, "Inactive") }
                  : { label: "Reactivate", icon: Power, onClick: () => setStudentStatusFn(e.enrollment_id, "Active") },
                { label: "Delete permanently", icon: Trash2, danger: true, separatorBefore: true, onClick: () => deleteStudent(e.enrollment_id, e.full_name) },
              ]} />
            ),
          },
        ]}
      />
    </Panel>
  );

  const renderTasks = () => (
    <div className="space-y-4">
      <FilterChips value={taskFilter} onChange={setTaskFilter} options={[
        { value: "pending", label: "To review", count: pendingTasks.length },
        { value: "assigned", label: "Assigned", count: taskSubmissions.filter(t => t.status === "assigned").length },
        { value: "approved", label: "Approved", count: taskSubmissions.filter(t => t.status === "approved").length },
        { value: "rejected", label: "Rejected", count: taskSubmissions.filter(t => t.status === "rejected").length },
        { value: "all", label: "All", count: taskSubmissions.length },
      ]} />
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : filteredTasks.length === 0 ? (
        <Panel><EmptyState icon={ClipboardList} title={taskFilter === "pending" ? "Nothing to review" : "No tasks here"} hint="Assign a task and it will appear once a student submits work." action={<Button size="sm" onClick={() => setDialog("assign-task")}>Assign task</Button>} /></Panel>
      ) : (
        <div className="space-y-3">{filteredTasks.map(t => <TaskCard key={t.id} task={t} onReview={reviewTask} onDownload={downloadTaskFile} />)}</div>
      )}
    </div>
  );

  const renderStaff = () => {
    const rows = staffList.filter(s => match(s.staff_id, s.full_name, s.email, s.department));
    return (
      <Panel>
        <DataTable
          rows={rows} loading={loading}
          empty={<EmptyState icon={Users} title={q ? "No staff match your search" : "No staff yet"} hint="Staff accounts get their own ID and temporary password." action={!q && <Button size="sm" onClick={() => setDialog("add-staff")}>Add staff</Button>} />}
          columns={[
            { header: "Staff member", cell: s => <PersonCell name={s.full_name} sub={s.email} /> },
            { header: "Staff ID", cell: s => <span className="font-mono text-xs">{s.staff_id}</span> },
            { header: "Department", cell: s => <span className="text-sm">{s.department || "—"}</span> },
            { header: "Status", cell: s => <Pill>{s.status || "active"}</Pill> },
            { header: "Joined", cell: s => <span className="text-xs text-muted-foreground">{fmtDate(s.created_at)}</span> },
            {
              header: "", className: "w-12 text-right", cell: s => (
                <RowMenu label={s.full_name} actions={[
                  s.status === "inactive"
                    ? { label: "Reactivate", icon: Power, onClick: () => setStaffStatus(s.staff_id, "active") }
                    : { label: "Deactivate", icon: PowerOff, onClick: () => setStaffStatus(s.staff_id, "inactive") },
                  { label: "Generate temporary password", icon: KeyRound, onClick: () => resetPassword("manage-staff", { action: "reset_staff_password", staff_id: s.staff_id }) },
                  { label: "Delete permanently", icon: Trash2, danger: true, separatorBefore: true, onClick: () => removeStaff(s.staff_id, s.full_name) },
                ]} />
              ),
            },
          ]}
        />
      </Panel>
    );
  };

  const renderAdmins = () => (
    <div className="space-y-6">
      <Panel title="Add an admin">
        <div className="max-w-lg space-y-2 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">They need an existing account. Enter the email they signed up with.</p>
          <div className="flex gap-2">
            <Input type="email" aria-label="Admin email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddAdmin()} placeholder="name@example.com" />
            <Button onClick={handleAddAdmin} disabled={addingAdmin || !newAdminEmail}>{addingAdmin ? <Loader2 size={14} className="animate-spin" /> : "Add admin"}</Button>
          </div>
        </div>
      </Panel>
      <Panel title={`Current admins (${adminList.length})`}>
        <DataTable
          rows={adminList.map(a => ({ ...a, id: a.user_id }))} loading={loading}
          empty={<EmptyState icon={Shield} title="No admins found" />}
          columns={[
            { header: "Admin", cell: a => <PersonCell name={a.display_name || a.email} sub={a.display_name ? a.email : undefined} /> },
            { header: "Role", cell: a => <Pill tone={a.is_main ? "violet" : "grey"}>{a.is_main ? "Main admin" : "Admin"}</Pill> },
            { header: "", className: "w-12 text-right", cell: a => !a.is_main && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Remove ${a.email}`} onClick={() => removeAdmin(a.user_id, a.email)}><Trash2 size={15} /></Button>
            ) },
          ]}
        />
      </Panel>
    </div>
  );

  const renderSimple = (rows: any[], columns: Column<any>[], icon: any, title: string, hint: string) => (
    <Panel><DataTable rows={rows} columns={columns} loading={loading} empty={<EmptyState icon={icon} title={q ? "Nothing matches your search" : title} hint={q ? undefined : hint} />} /></Panel>
  );

  const renderView = () => {
    switch (view) {
      case "overview": return renderOverview();
      case "students": return renderStudents();
      case "tasks": return renderTasks();
      case "staff": return renderStaff();
      case "admins": return renderAdmins();
      case "contacts": return renderSimple(contacts.filter(c => match(c.name, c.email, c.subject, c.message)), [
        { header: "From", cell: c => <PersonCell name={c.name} sub={c.email} /> },
        { header: "Subject", cell: c => <span className="text-sm font-medium">{c.subject}</span> },
        { header: "Message", cell: c => <p className="max-w-sm truncate text-sm text-muted-foreground" title={c.message}>{c.message}</p> },
        { header: "Received", cell: c => <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(c.created_at)}</span> },
        { header: "", className: "w-12 text-right", cell: c => <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Reply to ${c.name}`} asChild><a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject ?? "")}`}><Mail size={15} /></a></Button> },
      ], Inbox, "No messages yet", "Messages from the contact form will appear here.");
      case "bookings": return renderSimple(bookings.filter(b => match(b.name, b.email, b.service)), [
        { header: "Requester", cell: b => <PersonCell name={b.name} sub={b.email} /> },
        { header: "Service", cell: b => <Badge variant="outline">{b.service}</Badge> },
        { header: "Preferred date", cell: b => <span className="text-sm">{b.preferred_date}</span> },
        { header: "Time", cell: b => <span className="text-sm">{b.preferred_time}</span> },
      ], Calendar, "No bookings yet", "Booking requests will appear here.");
      case "certificates": return renderSimple(certificates.filter(c => match(c.student_name, c.enrollment_id, c.course)), [
        { header: "Student", cell: c => <PersonCell name={c.student_name} /> },
        { header: "Enrolment ID", cell: c => <span className="font-mono text-xs">{c.enrollment_id}</span> },
        { header: "Course", cell: c => <span className="text-sm">{c.course}</span> },
        { header: "Type", cell: c => <Badge variant="outline">{c.type}</Badge> },
        { header: "Issued", cell: c => <span className="text-xs text-muted-foreground">{fmtDate(c.issued_date)}</span> },
      ], Award, "No certificates issued", "Issued certificates will be listed here.");
      case "offers": return renderSimple(offers.filter(o => match(o.student_name, o.enrollment_id, o.course, o.file_name)), [
        { header: "Student", cell: o => <PersonCell name={o.student_name} /> },
        { header: "Enrolment ID", cell: o => <span className="font-mono text-xs">{o.enrollment_id}</span> },
        { header: "Course", cell: o => <span className="text-sm">{o.course}</span> },
        { header: "File", cell: o => <span className="text-xs">{o.file_name}</span> },
        { header: "Uploaded", cell: o => <span className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</span> },
      ], FileText, "No offer letters yet", "Upload an offer letter to attach it to a student.");
      case "courses": return <AdminCoursesManager />;
      case "cms": return <AdminCourseCMS />;
      case "internships": return <AdminInternshipReview />;
      case "partnerships": return <AdminPartnershipsManager />;
      case "exports": return <AdminExports />;
      case "jael": return (
        <div className="space-y-6"><AdminAIAssetsManager /><AdminPartnerLogoManager /><JaelFeedbackViewer /></div>
      );
    }
  };

  /* ---------------------------------- shell --------------------------------- */

  return (
    <DashboardSidebar groups={sidebarGroups}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 pl-16 sm:px-6 lg:px-10 lg:pl-10">
          <div className="relative max-w-md flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search this page" value={query} onChange={e => setQuery(e.target.value)}
              disabled={!searchable.includes(view)}
              placeholder={searchable.includes(view) ? `Search ${meta.title.toLowerCase()}…` : "Search isn't available here"}
              className="h-9 bg-muted/50 pl-9 pr-8"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/"><ExternalLink size={14} className="mr-1.5" /> View site</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
                  <Bell size={17} />
                  {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications</p>
                  ) : notifications.map(n => (
                    <button key={n.id} onClick={() => !n.read && markNotificationRead(n.id)} className={`flex w-full gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-muted/50 ${n.read ? "opacity-60" : ""}`}>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                      <span className="min-w-0">
                        <span className="block text-sm">{n.title || n.message}</span>
                        {n.title && n.message && <span className="block truncate text-xs text-muted-foreground">{n.message}</span>}
                        <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Avatar className="h-8 w-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={adminName} />}
              <AvatarFallback className="text-xs">{adminName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1400px] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{view === "overview" ? `Good to see you, ${adminName.split(" ")[0]}` : meta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {headerAction[view]}
        </div>
        {renderView()}
      </main>

      {/* Add student */}
      <Dialog open={dialog === "add-student"} onOpenChange={o => !o && setDialog("")}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader><DialogTitle>Add student</DialogTitle><DialogDescription>An enrolment ID is generated automatically.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Field label="Full name"><Input value={addStudentForm.fullName} onChange={e => setAddStudentForm({ ...addStudentForm, fullName: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={addStudentForm.email} onChange={e => setAddStudentForm({ ...addStudentForm, email: e.target.value })} placeholder="student@example.com" /></Field>
            <Field label="Phone (optional)"><Input value={addStudentForm.phone} onChange={e => setAddStudentForm({ ...addStudentForm, phone: e.target.value })} placeholder="+233…" /></Field>
            <Field label="Course">
              <Select value={addStudentForm.course} onValueChange={v => setAddStudentForm({ ...addStudentForm, course: v })}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>{COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={addStudentForm.createAccount} onChange={e => setAddStudentForm({ ...addStudentForm, createAccount: e.target.checked })} />
              <span>Create a login with a temporary password<span className="block text-xs text-muted-foreground">The student can sign in right away and change it in Profile Settings.</span></span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialog("")}>Cancel</Button>
            <Button onClick={handleAddStudent} disabled={addingStudent}>{addingStudent && <Loader2 size={14} className="mr-1.5 animate-spin" />}Add student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit student */}
      <Dialog open={!!editStudent} onOpenChange={o => !o && setEditStudent(null)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Edit student</DialogTitle><DialogDescription className="font-mono">{editStudent?.enrollment_id}</DialogDescription></DialogHeader>
          {editStudent && (
            <div className="space-y-4">
              <Field label="Full name"><Input value={editStudent.full_name ?? ""} onChange={e => setEditStudent({ ...editStudent, full_name: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={editStudent.email ?? ""} onChange={e => setEditStudent({ ...editStudent, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={editStudent.phone ?? ""} onChange={e => setEditStudent({ ...editStudent, phone: e.target.value })} /></Field>
              <Field label="Course">
                <Select value={editStudent.course ?? ""} onValueChange={v => setEditStudent({ ...editStudent, course: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                  <SelectContent>{COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={editStudent.status ?? "Active"} onValueChange={v => setEditStudent({ ...editStudent, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Active", "Inactive", "Completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button onClick={handleSaveStudent} disabled={savingStudent}>{savingStudent && <Loader2 size={14} className="mr-1.5 animate-spin" />}Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add staff */}
      <Dialog open={dialog === "add-staff"} onOpenChange={o => !o && setDialog("")}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader><DialogTitle>Add staff member</DialogTitle><DialogDescription>A staff ID is generated automatically.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Field label="Full name"><Input value={staffForm.fullName} onChange={e => setStaffForm({ ...staffForm, fullName: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@example.com" /></Field>
            <Field label="Department (optional)"><Input value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })} placeholder="e.g. Education, IT Support" /></Field>
            <Field label="Temporary password (optional)" hint="Leave blank to generate a secure one. Minimum 8 characters.">
              <Input value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} />
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialog("")}>Cancel</Button>
            <Button onClick={handleCreateStaff} disabled={creatingStaff}>{creatingStaff && <Loader2 size={14} className="mr-1.5 animate-spin" />}Add staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign task */}
      <Dialog open={dialog === "assign-task"} onOpenChange={o => !o && setDialog("")}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Assign task</DialogTitle><DialogDescription>Find the student by enrolment ID first.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Field label="Enrolment ID">
              <div className="flex gap-2">
                <Input value={assignForm.enrollmentId} onChange={e => setAssignForm({ ...assignForm, enrollmentId: e.target.value })} onKeyDown={e => e.key === "Enter" && lookup(assignForm.enrollmentId, setAssignStudent)} placeholder="DTEN-XXXXXXXX" className="font-mono" />
                <Button variant="outline" onClick={() => lookup(assignForm.enrollmentId, setAssignStudent)}>Find</Button>
              </div>
            </Field>
            {assignStudent && <div className="rounded-lg border border-primary/30 bg-primary/5 p-3"><PersonCell name={assignStudent.full_name} sub={`${assignStudent.email} · ${assignStudent.course}`} /></div>}
            <Field label="Task title"><Input value={assignForm.taskTitle} onChange={e => setAssignForm({ ...assignForm, taskTitle: e.target.value })} placeholder="e.g. Week 3: React components" /></Field>
            <Field label="Instructions (optional)"><Textarea className="h-24" value={assignForm.description} onChange={e => setAssignForm({ ...assignForm, description: e.target.value })} placeholder="What should the student submit?" /></Field>
            <Field label="Due date (optional)"><Input type="date" value={assignForm.dueDate} min={new Date().toISOString().split("T")[0]} onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })} /></Field>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialog("")}>Cancel</Button>
            <Button onClick={handleAssignTask} disabled={assigning || !assignStudent}>{assigning && <Loader2 size={14} className="mr-1.5 animate-spin" />}Assign task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload offer */}
      <Dialog open={dialog === "upload-offer"} onOpenChange={o => !o && setDialog("")}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Upload offer letter</DialogTitle><DialogDescription>PDF or Word documents.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Field label="Enrolment ID">
              <div className="flex gap-2">
                <Input value={offerForm.enrollmentId} onChange={e => setOfferForm({ ...offerForm, enrollmentId: e.target.value })} onKeyDown={e => e.key === "Enter" && lookup(offerForm.enrollmentId, setOfferStudent)} placeholder="DTEN-XXXXXXXX" className="font-mono" />
                <Button variant="outline" onClick={() => lookup(offerForm.enrollmentId, setOfferStudent)}>Find</Button>
              </div>
            </Field>
            {offerStudent && (
              <>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3"><PersonCell name={offerStudent.full_name} sub={offerStudent.course} /></div>
                <Field label="Note (optional)"><Input value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} /></Field>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setOfferFile(e.target.files?.[0] || null)} className="text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20" />
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialog("")}>Cancel</Button>
            <Button onClick={uploadOfferLetter} disabled={!offerFile || !offerStudent || uploadingOffer}>{uploadingOffer && <Loader2 size={14} className="mr-1.5 animate-spin" />}Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm destructive action */}
      <Dialog open={!!confirm} onOpenChange={o => !o && !confirming && setConfirm(null)}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader><DialogTitle>{confirm?.title}</DialogTitle><DialogDescription>{confirm?.body}</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={confirming}>Cancel</Button>
            <Button variant="destructive" onClick={runConfirm} disabled={confirming}>{confirming && <Loader2 size={14} className="mr-1.5 animate-spin" />}{confirm?.label}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary credentials */}
      <Dialog open={!!tempCreds} onOpenChange={o => !o && setTempCreds(null)}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>Share this with the user now. It won't be shown again. They should change it in Profile Settings after signing in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="break-all"><span className="text-muted-foreground">Email </span><span className="font-medium">{tempCreds?.email}</span></div>
            <div className="break-all"><span className="text-muted-foreground">Password </span><span className="font-mono font-semibold text-primary">{tempCreds?.password}</span></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${tempCreds?.email} / ${tempCreds?.password}`); toast({ title: "Copied to clipboard" }); }}>
              <Copy size={14} className="mr-1.5" /> Copy
            </Button>
            <Button onClick={() => setTempCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardSidebar>
  );
};

export default AdminDashboard;
