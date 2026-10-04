import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";

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

      {/* Left panel (redesigned) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative hidden w-[55%] items-center justify-center overflow-hidden lg:flex"
        style={{ background: "#031b4a" }}
      >
        <NetworkArt />
        <motion.img
          src={darylLogo}
          alt="Daryl Tech & Educational Network"
          className="relative z-10 w-[60%] max-w-[360px] select-none rounded-xl shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <div className="absolute inset-x-12 bottom-12 z-10 max-w-sm text-white">
          <h2 className="mb-2 text-3xl font-extrabold leading-tight tracking-tight">
            One network for learning, building and sharing.
          </h2>
          <p className="text-sm text-white/70">
            Read research, follow projects and learn alongside other students. Join Daryl Tech & Educational Network to read research, follow projects and learn alongside other students.
          </p>
        </div>
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
              onClick={() => setIsLogin(true)}
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
                <Button type="submit" className="w-full rounded-lg py-5 text-sm font-semibold" disabled={loading || otpCode.length !== 6}>
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
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="display name"
                      className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground"
                    />
                  </motion.div>
                )}

                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  className="rounded-lg border-border bg-card py-5 text-sm placeholder:text-muted-foreground"
                  required
                />

                {!(isLogin && loginWithOtp) && (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "password" : "create password (optional)"}
                    className="rounded-lg border-border bg-card py-5 pr-16 text-sm placeholder:text-muted-foreground"
                    required={isLogin}
                    minLength={isLogin ? 6 : 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                )}

                <Button type="submit" className="w-full rounded-lg py-5 text-sm font-semibold" disabled={loading}>
                  {loading ? "Please wait..." : isLogin ? (loginWithOtp ? "Email me a login code" : "Log in") : "Send verification code"}
                </Button>

                {isLogin && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLoginWithOtp((v) => !v)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {loginWithOtp ? "Use password instead" : "Log in with a one-time code"}
                    </button>
                    <p className="text-center text-xs text-muted-foreground">
                      <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                    </p>
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
