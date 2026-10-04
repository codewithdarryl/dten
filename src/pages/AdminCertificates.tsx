import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Search, Plus, Loader2, CheckCircle, ArrowLeft, Download, Printer } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { getSessionOnce } from "@/lib/session";
import { downloadCertificate, printCertificate } from "@/lib/certificate";

const certTypes = ["Certificate of Completion", "Letter of Recommendation", "Certificate of Excellence"];

const AdminCertificates = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Enrollment lookup
  const [searchId, setSearchId] = useState("");
  const [enrollment, setEnrollment] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Certificate form
  const [form, setForm] = useState({
    type: "",
    description: "",
  });

  // Existing certificates for the enrollment
  const [existingCerts, setExistingCerts] = useState<any[]>([]);

  // Dashboard data
  const [allCerts, setAllCerts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "pending">("all");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await getSessionOnce();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const allowed = (roles || []).some((r) => r.role === "admin" || r.role === "staff");
      if (!allowed) {
        navigate("/");
        return;
      }
      setIsAdmin(true);
      setAuthChecked(true);
    };
    checkAccess();
  }, [navigate]);

  const loadOverview = async () => {
    setOverviewLoading(true);
    const [{ data: certs }, { data: enrolls }] = await Promise.all([
      supabase.from("certificates").select("*").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("enrollment_id, full_name, email, course, status, created_at").order("created_at", { ascending: false }),
    ]);
    setAllCerts(certs || []);
    setStudents(enrolls || []);
    setOverviewLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview();
  }, [isAdmin]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return students
      .map((s) => {
        const certs = allCerts.filter((c) => c.enrollment_id === s.enrollment_id);
        return { ...s, certs, issued: certs.length > 0 };
      })
      .filter((s) => (statusFilter === "all" ? true : statusFilter === "issued" ? s.issued : !s.issued))
      .filter((s) =>
        !q
          ? true
          : [s.full_name, s.email, s.enrollment_id, s.course].some((v: string) => (v || "").toLowerCase().includes(q)),
      );
  }, [students, allCerts, filter, statusFilter]);
  
  const lookupEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchId.trim().toUpperCase();
    if (!trimmed) return;
    setSearching(true);
    setEnrollment(null);
    setExistingCerts([]);
    setSuccess("");
    setError("");

    const { data: enrollData } = await supabase
      .from("enrollments")
      .select("*")
      .eq("enrollment_id", trimmed)
      .maybeSingle();

    if (enrollData) {
      setEnrollment(enrollData);
      const { data: certs } = await supabase
        .from("certificates")
        .select("*")
        .eq("enrollment_id", trimmed)
        .order("created_at", { ascending: false });
      setExistingCerts(certs || []);
    } else {
      setError("No enrollment found with that ID.");
    }
    setSearching(false);
  };

  const quickSelect = (enrollmentId: string) => {
    setSearchId(enrollmentId);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      setSearchId(enrollmentId);
      void (async () => {
        setSearching(true);
        setSuccess("");
        setError("");
        const { data: enrollData } = await supabase
          .from("enrollments").select("*").eq("enrollment_id", enrollmentId).maybeSingle();
        if (enrollData) {
          setEnrollment(enrollData);
          const { data: certs } = await supabase
            .from("certificates").select("*").eq("enrollment_id", enrollmentId)
            .order("created_at", { ascending: false });
          setExistingCerts(certs || []);
        }
        setSearching(false);
        void fakeEvent;
      })();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const issueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data: created, error: dbError } = await supabase.from("certificates").insert({
        enrollment_id: enrollment.enrollment_id,
        student_name: enrollment.full_name,
        course: enrollment.course,
        type: form.type,
        description: form.description || null,
      }).select("certificate_number").single();
      if (dbError) throw dbError;

      setSuccess(`${form.type} issued to ${enrollment.full_name}. Verification number: ${created?.certificate_number}`);
      setForm({ type: "", description: "" });

      // Refresh certs list
      const { data: certs } = await supabase
        .from("certificates")
        .select("*")
        .eq("enrollment_id", enrollment.enrollment_id)
        .order("created_at", { ascending: false });
      setExistingCerts(certs || []);
            loadOverview();
    } catch (err: any) {
      setError(err.message || "Failed to issue certificate.");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <section className="container mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <p className="mb-2 text-sm font-mono uppercase tracking-widest text-primary">Admin Panel</p>
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            Certificate <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">Issue certificates manually, track who has received one, and download copies.</p>
        </motion.div>

        {/* Enrollment Lookup */}
        <div className="mx-auto max-w-2xl space-y-8">
          <form onSubmit={lookupEnrollment} className="flex gap-3">
            <input
              required
              maxLength={20}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Enrollment ID (e.g. DTEN-A3B7X9K2)"
              className="flex h-12 flex-1 rounded-lg border border-border bg-background px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" disabled={searching} className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50">
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Find
            </button>
          </form>

          {error && !enrollment && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
          )}

          {enrollment && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Student info */}
              <div className="rounded-xl border border-primary/30 bg-card p-6 glow-border">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Student Details</h2>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono font-semibold text-primary">{enrollment.enrollment_id}</span></div>
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{enrollment.full_name}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{enrollment.email}</span></div>
                  <div><span className="text-muted-foreground">Course:</span> <span className="font-medium">{enrollment.course}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{enrollment.status}</span></div>
                </div>
              </div>

              {/* Existing certificates */}
              {existingCerts.length > 0 && (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Award size={16} className="text-primary" /> Issued Documents ({existingCerts.length})</h2>
                  <div className="space-y-3">
                    {existingCerts.map((cert) => (
                      <div key={cert.id} className="rounded-lg border border-border bg-card p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">{cert.type}</span>
                          <span className="text-xs text-muted-foreground">{new Date(cert.issued_date).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 break-all font-mono text-xs font-semibold text-primary">{cert.certificate_number}</p>
                        <p className="mt-1 text-muted-foreground">{cert.course}</p>
                        {cert.description && <p className="mt-1 text-xs text-muted-foreground">{cert.description}</p>}
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => downloadCertificate(cert)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">
                            <Download size={12} /> Download
                          </button>
                          <button onClick={() => printCertificate(cert)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">
                            <Printer size={12} /> Print / Preview
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue new cert form */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Plus size={16} className="text-primary" /> Issue New Document</h2>
                {success && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                    <CheckCircle size={16} /> {success}
                  </div>
                )}
                {error && enrollment && (
                  <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                )}
                <form onSubmit={issueCertificate} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="cert-type">Document Type</label>
                    <select id="cert-type" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select type...</option>
                      {certTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="cert-desc">Description / Notes (optional)</label>
                    <textarea id="cert-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Outstanding performance in final project..." />
                  </div>
                  <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Issuing...</> : <><Award size={16} /> Issue Document</>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Student certificate status overview */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Award size={18} className="text-primary" /> Students &amp; certificate status</h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search name, email, ID or course"
                aria-label="Search students"
                className="h-9 w-64 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
              <select
                aria-label="Filter by certificate status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All students</option>
                <option value="issued">Certificate issued</option>
                <option value="pending">Not yet issued</option>
              </select>
            </div>
          </div>

          {overviewLoading ? (
            <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No students match this filter.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Enrollment ID</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.enrollment_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{s.enrollment_id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.course}</td>
                      <td className="px-4 py-3">
                        {s.issued ? (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">Issued ({s.certs.length})</span>
                        ) : (
                          <span className="rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-semibold text-yellow-500">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.issued ? (
                          <div className="flex flex-wrap gap-2">
                            {s.certs.map((c: any) => (
                              <button
                                key={c.id}
                                onClick={() => downloadCertificate(c)}
                                title={`${c.type} — ${c.certificate_number}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                              >
                                <Download size={11} /> {c.certificate_number}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => quickSelect(s.enrollment_id)} className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-2.5 py-1 text-xs text-primary hover:bg-primary/10">
                            <Plus size={11} /> Issue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminCertificates;
