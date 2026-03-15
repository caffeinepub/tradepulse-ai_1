import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn, identity } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      navigate({ to: "/dashboard" });
    }
  }, [identity, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 glow-buy mb-4">
          <TrendingUp className="w-6 h-6 text-buy" />
        </div>
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Sign in to your TradePulse AI account
        </p>
        <Button
          onClick={() => login()}
          disabled={isLoggingIn}
          className="w-full bg-primary/20 border border-primary/40 text-buy hover:bg-primary/30 font-semibold gap-2"
          data-ocid="login.submit_button"
        >
          {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoggingIn ? "Connecting…" : "Sign In with Internet Identity"}
        </Button>
      </motion.div>
    </div>
  );
}
