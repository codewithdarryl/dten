import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X } from "lucide-react";
import { z } from "zod";
import { invokeFn } from "@/lib/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import darylLogo from "@/assets/daryl-tech-logo.png";


const PW_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One capital letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/, "Username: 3–30 letters, numbers, dots or underscores."),
  email: z.string().trim().email("Enter a valid email.").max(255),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number."),
  password: z.string().max(72).refine((p) => PW_RULES.every((r) => r.test(p)), "Password doesn't meet all the rules."),
  repeat: z.string(),
}).refine((d) => d.password === d.repeat, { message: "Passwords don't match.", path: ["repeat"] });

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({ fullName: "", username: "", email: "", phone: "", password: "", repeat: "" });
  const [usernameFree, setUsernameFree] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  // Email-code login
  const [mode, setMode] = useState<"password" | "code">("password");
  const [codeStep, setCodeStep] = useState<"email" | "verify">("email");
  const [codeEmail, setCodeEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const safeRedirect = () => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    return r && r.startsWith("/") && !r.startsWith("//") ? r : null;
  };
  const authReturnUrl = () => {
    const r = safeRedirect();
    return r ? `${window.location.origin}/auth?redirect=${encodeURIComponent(r)}` : window.location.origin;
  };

  // Live username availability check
  useEffect(() => {
    const u = form.username.trim().toLowerCase();
    if (isLogin || !/^[a-z0-9_.]{3,30}$/.test(u)) { setUsernameFree(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await invokeFn<{ available: boolean }>("auth-helper", { action: "check_username", username: u });
        setUsernameFree(r.available);
      } catch { setUsernameFree(null); }
    }, 450);
    return () => clearTimeout(t);
  }, [form.username, isLogin]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const routeUser = async (userId: string) => {
      const redirectParam = safeRedirect();
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("must_change_password").eq("user_id", userId).maybeSingle(),
      ]);
      if (profile?.must_change_password) {
        navigate("/profile/settings?change_password=1");
        return;
      }
      const list = (roles || []).map((r) => r.role);
      if (redirectParam) navigate(redirectParam);
      else if (list.includes("admin")) navigate("/admin/dashboard");
      else if (list.includes("staff")) navigate("/staff/dashboard");
      else navigate("/student/dashboard");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === "SIGNED_IN") setTimeout(() => routeUser(session.user.id), 0);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) routeUser(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const signInWithTokens = async (identifierValue: string, pw: string) => {
    const r = await invokeFn<{ access_token: string; refresh_token: string }>("auth-helper", {
      action: "login", identifier: identifierValue, password: pw,
    });
    const { error } = await supabase.auth.setSession(r);
    if (error) throw error;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setLoading(true);
    try {
      await signInWithTokens(identifier.trim(), password);
    } catch (err: any) {
      toast({ title: "Couldn't log in", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of email-code login: request a 6-digit code.
  // shouldCreateUser is false on purpose: accounts must be created through the
  // sign-up form so the username/profile rows exist.
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(codeEmail);
    if (!parsed.success) {
      toast({ title: "Check your email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data,
        options: { shouldCreateUser: false },
      });
      // Only surface rate limits; otherwise stay generic so we don't reveal which emails have accounts.
      if (error && error.status === 429) throw new Error("Too many requests. Please wait a minute and try again.");
      setCodeStep("verify");
      setOtp("");
      setCooldown(60);
      toast({ title: "Check your email", description: "If an account exists for that email, we've sent a 6-digit code." });
    } catch (err: any) {
      toast({ title: "Couldn't send code", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify the code. On success onAuthStateChange fires and routeUser redirects.
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast({ title: "Enter the code", description: "The code is 6 digits.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: codeEmail.trim(), token: otp, type: "email" });
      if (error) throw error;
    } catch {
      toast({ title: "Invalid or expired code", description: "Check the code or request a new one.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (usernameFree === false) {
      toast({ title: "Username taken", description: "Please choose another username.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const d = parsed.data;
      await invokeFn("auth-helper", {
        action: "signup", full_name: d.fullName, username: d.username, email: d.email, phone: d.phone, password: d.password,
      });
      await signInWithTokens(d.email, d.password);
      toast({ title: "Welcome to Daryl Tech!", description: "Your account is ready. Verify your email from your dashboard." });
    } catch (err: any) {
      toast({ title: "Sign-up failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: authReturnUrl(),
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Google sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: authReturnUrl(),
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Apple sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setAppleLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
  };

  return (
    <div className="relative flex min-h-screen">
      <Link
        to="/"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-primary"
      >
        <ArrowLeft size={13} /> Back to website
      </Link>
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden w-[55%] items-center justify-center lg:flex"
        style={{ background: "hsl(215, 40%, 12%)" }}
      >
        <motion.img
          src={darylLogo}
          alt="Daryl Tech & Educational Network"
          className="max-w-[420px] w-[70%] select-none"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </motion.div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <img src={darylLogo} alt="Daryl Tech" className="h-16" />
          </div>

          <h1 className="mb-1 text-center text-2xl font-bold tracking-widest text-foreground font-serif">
            DARYL TECH
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground font-serif">
            & Educational Network
          </p>

          {/* Social login — circular icon cards */}
          <p className="mb-4 text-center text-xs text-muted-foreground">Or continue with</p>
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              aria-label="Continue with Google"
              className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={appleLoading}
              aria-label="Continue with Apple"
              className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:opacity-60"
            >
              {appleLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.6 100.9c22.3-26.5 20.3-50.6 19.7-59.3-19.8 1.1-42.7 13.4-55.8 28.6-14.4 16.3-22.9 36.5-21.1 57.9 21.4 1.6 40.9-9.3 57.2-27.2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => { setIsLogin(true); setMode("password"); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                !isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            {isLogin && mode === "code" ? (
              <motion.form key="code" variants={formVariants} initial="hidden" animate="visible" exit="exit"
                onSubmit={codeStep === "email" ? sendCode : verifyCode} className="space-y-4">
                {codeStep === "email" ? (
                  <>
                    <Input type="email" value={codeEmail} onChange={(e) => setCodeEmail(e.target.value)} placeholder="Email"
                      autoComplete="email" required maxLength={255} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                    <Button type="submit" className="w-full rounded-lg py-5 text-sm font-semibold" disabled={loading}>
                      {loading ? "Sending..." : "Send me a code"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-center text-xs text-muted-foreground">
                      Enter the 6-digit code sent to <span className="font-medium text-foreground">{codeEmail}</span>
                    </p>
                    <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                      inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
                      className="rounded-lg border-border bg-card py-5 text-center text-lg tracking-[0.5em] placeholder:text-muted-foreground" />
                    <Button type="submit" className="w-full rounded-lg py-5 text-sm font-semibold" disabled={loading}>
                      {loading ? "Verifying..." : "Verify and log in"}
                    </Button>
                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={() => { setCodeStep("email"); setOtp(""); }} className="text-muted-foreground hover:text-foreground">
                        Change email
                      </button>
                      <button type="button" disabled={cooldown > 0 || loading} onClick={() => sendCode()}
                        className="text-primary hover:underline disabled:opacity-50 disabled:no-underline">
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                      </button>
                    </div>
                  </>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  <button type="button" onClick={() => { setMode("password"); setCodeStep("email"); setOtp(""); }} className="text-primary hover:underline">
                    Use password instead
                  </button>
                </p>
              </motion.form>
            ) : isLogin ? (
              <motion.form key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit"
                onSubmit={handleLogin} className="space-y-4">
                <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Username or email"
                  autoComplete="username" required maxLength={255} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" autoComplete="current-password" required className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground pr-16" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Button type="submit" className="w-full rounded-lg py-5 text-sm font-semibold" disabled={loading}>
                  {loading ? "Please wait..." : "Log in"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  <button type="button" onClick={() => { setMode("code"); setCodeStep("email"); }} className="text-primary hover:underline">
                    Log in with an email code instead
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form key="signup" variants={formVariants} initial="hidden" animate="visible" exit="exit"
                onSubmit={handleSignup} className="space-y-3">
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Full name" autoComplete="name" required maxLength={120} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                <div>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })}
                    placeholder="Username" autoComplete="username" required maxLength={30} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                  {usernameFree === true && <p className="mt-1 text-xs text-primary">Username is available</p>}
                  {usernameFree === false && <p className="mt-1 text-xs text-destructive">Username is taken</p>}
                </div>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email" autoComplete="email" required maxLength={255} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number (e.g. +233 50 000 0000)" autoComplete="tel" required maxLength={20} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Password" autoComplete="new-password" required maxLength={72} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground pr-16" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {PW_RULES.map((r) => {
                    const ok = r.test(form.password);
                    return (
                      <li key={r.label} className={`flex items-center gap-1 ${ok ? "text-primary" : "text-muted-foreground"}`}>
                        {ok ? <Check size={11} /> : <X size={11} />} {r.label}
                      </li>
                    );
                  })}
                </ul>
                <div>
                  <Input type={showPassword ? "text" : "password"} value={form.repeat}
                    onChange={(e) => setForm({ ...form, repeat: e.target.value })}
                    placeholder="Repeat password" autoComplete="new-password" required maxLength={72} className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground" />
                  {form.repeat && form.repeat !== form.password && (
                    <p className="mt-1 text-xs text-destructive">Passwords don't match</p>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-lg py-5 text-sm font-semibold" disabled={loading}>
                  {loading ? "Creating your account..." : "Create account"}
                </Button>
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  By signing up you agree to our{" "}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
