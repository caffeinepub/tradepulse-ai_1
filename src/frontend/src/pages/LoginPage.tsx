import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError, identity } =
    useInternetIdentity();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (identity) {
      navigate({ to: "/dashboard" });
    }
  }, [identity, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
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
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your TradePulse AI account
          </p>
        </div>

        <div className="terminal-border bg-card rounded-lg p-6">
          {isLoginError && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {loginError?.message ?? "Login failed. Please try again."}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-ocid="login.email_input"
                className="bg-input border-border font-mono-num text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-ocid="login.password_input"
                className="bg-input border-border"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary/20 border border-primary/40 text-buy hover:bg-primary/30 font-semibold gap-2"
              data-ocid="login.submit_button"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isLoggingIn ? "Connecting…" : "Sign In with Internet Identity"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              data-ocid="login.register_link"
              className="text-buy hover:underline font-medium"
            >
              Create one free
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Powered by Internet Identity — secure, decentralized auth.
        </p>
      </motion.div>
    </div>
  );
}
