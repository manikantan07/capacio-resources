import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { color, radius } from "../theme";

/**
 * Real login: email + password against accounts stored in the database (see
 * DeliveryHub.Api's AuthController / AppUserSeeder). Independent of the Microsoft
 * Entra ID plan noted in the architecture doc, which still needs a tenant ID — when
 * that's ready, this form is replaced by a "Sign in with Microsoft" redirect, but the
 * rest of the app (role gating, useAuth()) doesn't change.
 */
export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid work email");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate("/allocation");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.page }}>
      <div
        style={{
          width: 380,
          background: color.surface,
          border: `1px solid ${color.border}`,
          borderRadius: radius.card,
          padding: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: color.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Capcio</div>
            <div style={{ fontSize: 11.5, color: color.textTertiary }}>Resource Allocation</div>
          </div>
        </div>

        <TextField
          fullWidth
          label="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!error}
          helperText={error}
          sx={{ mb: 2 }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={submitting} sx={{ height: 44 }}>
          Sign in
        </Button>

        <div style={{ fontSize: 11, color: color.textFaint, marginTop: 20, textAlign: "center" }}>
          Having trouble signing in? Contact your workspace admin.
        </div>
      </div>
    </div>
  );
}
