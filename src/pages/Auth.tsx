import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import darylLogo from "@/assets/daryltech-auth-logo.jpg";

/* Drifting network that echoes the logo (red, gold, green, white nodes). */
const NetworkArt = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const cols = ["#e5231b", "#ffb300", "#2e9e3f", "#ffffff"];
    let w = 0, h = 0, raf = 0;
    const nodes = Array.from({ length: 34 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004, vy: (Math.random() - 0.5) * 0.0004,
      c: cols[i % 4], r: i % 5 === 0 ? 5 : 3,
    }));
    const resize = () => {
      const p = cv.parentElement!, d = window.devicePixelRatio || 1;
      w = p.clientWidth; h = p.clientHeight;
      cv.width = w * d; cv.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const max = Math.min(w, h) * 0.28;
      ctx.lineWidth = 1.2;
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach((b) => {
          const d = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          if (d < max) {
            ctx.globalAlpha = (1 - d / max) * 0.7;
            ctx.strokeStyle = a.c;
            ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;
      nodes.forEach((n) => {
        ctx.fillStyle = n.c;
        ctx.beginPath(); ctx.arc(n.x * w, n.y * h, n.r, 0, 7); ctx.fill();
      });
    };
    const tick = () => {
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      draw();
      raf = requestAnimationFrame(tick);
    };
    resize(); draw();
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(cv.parentElement!);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
};

const SocialButton = ({ label, loading, onClick, children }: { label: string; loading: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="flex h-12 items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:border-muted-foreground disabled:opacity-60"
  >
    {loading ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    ) : (
      children
    )}
    {label}
  </button>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [loginWithOtp, setLoginWithOtp] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const safeRedirect = () => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    return r && r.startsWith("/") && !r.startsWith("//") ? r : null;
  };
  const authReturnUrl = () => {
    const r = safeRedirect();
    return r ? `${window.location.origin}/auth?redirect=${encodeURIComponent(r)}` : window.location.origin;
  };

  const startCooldown = (seconds = 45) => setResendCooldown(seconds);

  const friendlyOtpError = (msg: string) => {
    const m = msg?.toLowerCase() || "";
    if (m.includes("expired")) return "That code has expired. Tap Resend to get a fresh one.";
    if (m.includes("invalid") || m.includes("token")) return "That code didn't match. Double-check the 6 digits or resend.";
    if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Wait a moment and try again.";
    if (m.includes("used")) return "That code was already used. Resend a new one.";
    return msg || "Something went wrong. Try resending the code.";
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: !isLogin,
          data: isLogin ? undefined : { display_name: displayName },
          emailRedirectTo: authReturnUrl(),
        },
      });
      if (error) throw error;
      startCooldown(45);
      setOtpCode("");
      toast({ title: "Code resent", description: `A new code is on its way to ${email}.` });
    } catch (err: any) {
      toast({ title: "Couldn't resend", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) return;
      if (event === "SIGNED_IN") {
        const { data: existingProfile } = await supabase
          .from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
        if (!existingProfile) {
          await supabase.from("profiles").insert({
            user_id: session.user.id,
            display_name: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
            email: session.user.email,
          });
        }
      }
      routeUser(session.user.id);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) routeUser(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin && !loginWithOtp) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (isLogin && loginWithOtp) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: authReturnUrl() },
        });
        if (error) throw error;
        setOtpStep(true);
        startCooldown(45);
        toast({ title: "Code sent", description: `We emailed a 6-digit login code to ${email}.` });
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: { display_name: displayName },
            emailRedirectTo: authReturnUrl(),
          },
        });
        if (error) throw error;
        setOtpStep(true);
        startCooldown(45);
        toast({ title: "Code sent", description: `We emailed a 6-digit code to ${email}.` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otpCode.length !== 6 || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });
      if (error) throw error;
      if (!isLogin && password && data.user) {
        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) console.warn("Password set failed:", pwErr.message);
      }
      toast({ title: "Account verified", description: "Welcome aboard!" });
    } catch (err: any) {
      toast({ title: "Invalid code", description: friendlyOtpError(err.message), variant: "destructive" });
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpStep && otpCode.length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, otpStep]);

  const handleOAuth = async (provider: "google" | "apple") => {
    const setBusy = provider === "google" ? setGoogleLoading : setAppleLoading;
    const name = provider === "google" ? "Google" : "Apple";
    setBusy(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: authReturnUrl(),
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: `${name} sign-in failed`, description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
  };

  const inputCls = "h-12 rounded-lg border-border bg-card text-sm placeholder:text-muted-foreground";
  const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
  const primaryCls = "h-12 w-full rounded-lg bg-[#ffb300] text-sm font-bold text-[#0b1b3a] hover:bg-[#ffb300]/90";

  return (
    <div className="relative flex min-h-screen">
      <Link
        to="/"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-primary lg:border-white/30 lg:bg-transparent lg:text-white lg:hover:bg-white/10 lg:hover:text-white"
      >
        <ArrowLeft size={13} /> Back to website
      </Link>

      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative hidden w-[55%] flex-col justify-end overflow-hidden bg-[#031b4a] p-12 lg:flex"
      >
        <NetworkArt />
        <div className="relative max-w-sm text-white">
          <h2 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight">
            One network for learning, building and sharing.
          </h2>
          <p className="text-base text-white/70">
            Join Daryl Tech &amp; Educational Network to read research, follow projects and learn alongside other students.
          </p>
        </div>
      </motion.div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-5 h-1 w-[72px] rounded-full" style={{ background: "linear-gradient(90deg,#e5231b 0 33%,#ffb300 33% 66%,#2e9e3f 66%)" }} />
          <img src={darylLogo} alt="Daryl Tech" className="mb-4 h-14 rounded-md lg:hidden" />
          <p className="text-lg font-bold tracking-widest text-foreground font-serif">DARYL TECH</p>
          <p className="mb-6 text-sm text-muted-foreground font-serif">& Educational Network</p>

          <h1 className="mb-5 text-2xl font-bold tracking-tight text-foreground">
            {otpStep ? "Check your email" : isLogin ? "Welcome back" : "Create your account"}
          </h1>

          {/* Tabs */}
          <div className="mb-6 flex gap-6 border-b border-border" role="tablist" aria-label="Account">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                role="tab"
                aria-selected={isLogin === v}
                onClick={() => setIsLogin(v)}
                className={`-mb-px border-b-[3px] pb-2.5 text-sm font-semibold transition-colors ${
                  isLogin === v ? "border-[#ffb300] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {v ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Social login */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <SocialButton label="Google" loading={googleLoading} onClick={() => handleOAuth("google")}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </SocialButton>
            <SocialButton label="Apple" loading={appleLoading} onClick={() => handleOAuth("apple")}>
              <svg className="h-5 w-5" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.6 100.9c22.3-26.5 20.3-50.6 19.7-59.3-19.8 1.1-42.7 13.4-55.8 28.6-14.4 16.3-22.9 36.5-21.1 57.9 21.4 1.6 40.9-9.3 57.2-27.2z" />
              </svg>
            </SocialButton>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or use your email</span>
            </div>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            {otpStep ? (
              <motion.form
                key="otp"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <p className="text-center text-sm text-muted-foreground">
                  Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>
                </p>
                <div className="flex justify-center">
                  <InputOTP autoFocus maxLength={6} value={otpCode} onChange={setOtpCode} disabled={loading}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className={primaryCls} disabled={loading || otpCode.length !== 6}>
                  {loading ? "Verifying..." : "Verify & continue"}
                </Button>
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending}
                    className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {resending
                      ? "Resending..."
                      : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtpCode(""); setResendCooldown(0); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Use a different email
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key={isLogin ? "login" : "signup"}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {!isLogin && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.3 }}>
                    <label htmlFor="auth-name" className={labelCls}>Display name</label>
                    <Input
                      id="auth-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How should we call you?"
                      autoComplete="nickname"
                      className={inputCls}
                    />
                  </motion.div>
                )}

                <div>
                  <label htmlFor="auth-email" className={labelCls}>Email address</label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={inputCls}
                    required
                  />
                </div>

                {!(isLogin && loginWithOtp) && (
                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="auth-password" className={labelCls}>{isLogin ? "Password" : "Password (optional)"}</label>
                      {isLogin && (
                        <Link to="/forgot-password" className="mb-1.5 text-xs text-foreground underline-offset-2 hover:underline">
                          Forgot password?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isLogin ? "Your password" : "At least 6 characters"}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        className={`${inputCls} pr-16`}
                        required={isLogin}
                        minLength={isLogin ? 6 : 0}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {!isLogin && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Leave it empty and we'll email you a code each time you sign in.
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" className={primaryCls} disabled={loading}>
                  {loading ? "Please wait..." : isLogin ? (loginWithOtp ? "Email me a login code" : "Log in") : "Send verification code"}
                </Button>

                {isLogin && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setLoginWithOtp((v) => !v)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {loginWithOtp ? "Use password instead" : "Log in with a one-time code"}
                    </button>
                  </div>
                )}

                {!isLogin && (
                  <p className="text-center text-xs text-muted-foreground leading-relaxed">
                    By signing up you agree to our{" "}
                    <span className="text-primary">Terms of Service</span> and{" "}
                    <span className="text-primary">Privacy Policy</span>
                  </p>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
