import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function RegisterPage() {
  const { login, isLoggingIn, isLoginError, loginError, identity } =
    useInternetIdentity();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (identity) {
      navigate({ to: "/dashboard" });
    }
  }, [identity, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    if (!displayName.trim()) {
      setValidationError("Display name is required.");
      return;
    }
    if (!email.trim()) {
      setValidationError("Email is required.");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }
    login();
  };

  const error =
    validationError ||
    (isLoginError ? (loginError?.message ?? "Registration failed") : "");

  const PERKS = [
    "$10,000 demo account on signup",
    "Live AI signals across 4 markets",
    "No risk — 100% simulated trading",
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, oklch(0.72 0.18 145 / 0.05) 0%, transparent 60%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 glow-buy mb-4">
            <TrendingUp className="w-6 h-6 text-buy" />
          </div>
          <h1 className="font-display text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join TradePulse AI and start trading smarter
          </p>
        </div>

        <div className="terminal-border bg-card rounded-lg p-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="displayName"
                className="text-xs text-muted-foreground"
              >
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g. AlphaTrader"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                data-ocid="register.name_input"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="regEmail"
                className="text-xs text-muted-foreground"
              >
                Email Address
              </Label>
              <Input
                id="regEmail"
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-ocid="register.email_input"
                className="bg-input border-border font-mono-num text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="regPassword"
                className="text-xs text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="regPassword"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-ocid="register.password_input"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs text-muted-foreground"
              >
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-ocid="register.confirm_password_input"
                className="bg-input border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary/20 border border-primary/40 text-buy hover:bg-primary/30 font-semibold gap-2"
              data-ocid="register.submit_button"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isLoggingIn ? "Creating Account…" : "Create Free Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              data-ocid="register.login_link"
              className="text-buy hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {PERKS.map((perk) => (
            <div
              key={perk}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-buy shrink-0" />
              <span>{perk}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
