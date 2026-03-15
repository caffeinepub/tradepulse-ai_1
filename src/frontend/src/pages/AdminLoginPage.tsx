import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { setAdminAuth } from "../adminAuth";
import { useActor } from "../hooks/useActor";

export function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { actor } = useActor();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 6) {
      setError("PIN must be exactly 6 digits.");
      return;
    }
    if (!actor) {
      setError("Not connected. Please try again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ok = await actor.verifyAdminPin(pin);
      if (ok) {
        setAdminAuth(true);
        window.location.href = "/admin/dashboard";
      } else {
        setError("Invalid PIN. Access denied.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0d1117" }}
    >
      <Card
        className="w-full max-w-sm border"
        style={{
          background: "#161b22",
          borderColor: "#30363d",
        }}
      >
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full"
              style={{
                background: "rgba(220, 163, 39, 0.12)",
                border: "1px solid rgba(220,163,39,0.3)",
              }}
            >
              <ShieldAlert className="w-6 h-6" style={{ color: "#dca327" }} />
            </div>
          </div>
          <CardTitle
            className="text-xl font-semibold tracking-wide"
            style={{ color: "#e6edf3" }}
          >
            TradePulse AI
          </CardTitle>
          <p className="text-sm mt-1" style={{ color: "#8b949e" }}>
            Admin Access Portal
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="pin"
                style={{
                  color: "#8b949e",
                  fontSize: "0.75rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Security PIN
              </Label>
              <Input
                id="pin"
                data-ocid="admin.pin_input"
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPin(val);
                  setError("");
                }}
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
                className="text-center text-lg tracking-[0.5em] font-mono"
                style={{
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  color: "#e6edf3",
                }}
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div
                data-ocid="admin.error_state"
                className="text-sm text-center py-2 px-3 rounded"
                style={{
                  background: "rgba(248,81,73,0.1)",
                  color: "#f85149",
                  border: "1px solid rgba(248,81,73,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <Button
              data-ocid="admin.submit_button"
              type="submit"
              className="w-full font-semibold"
              disabled={loading || pin.length !== 6}
              style={{
                background: loading || pin.length !== 6 ? "#21262d" : "#dca327",
                color: loading || pin.length !== 6 ? "#8b949e" : "#0d1117",
                border: "none",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Access Dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
