import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
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
const REMEMBER_KEY = "deliveryhub.rememberMe";
// Only the email is kept by the app; the password is left to the browser's password
// manager (offerToSaveCredential below) so it's never stored in plain localStorage.
const REMEMBERED_EMAIL_KEY = "deliveryhub.rememberedEmail";

/** Chromium's Credential Management API — not in lib.dom's typings everywhere. */
declare global {
  interface Window {
    PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential;
  }
}

type StoredPasswordCredential = Credential & { type: "password"; password: string };

/**
 * Ask the browser's password manager for the saved login. Chrome's own autofill doesn't
 * reliably fill React-controlled inputs (and holds the value back until the user
 * interacts), so with "Remember me" on we request it explicitly. Chrome may show its
 * account picker; nothing is ever stored by the app itself.
 */
async function getSavedCredential(): Promise<StoredPasswordCredential | null> {
  try {
    if (!window.PasswordCredential || !navigator.credentials?.get) return null;
    const credential = await navigator.credentials.get({ password: true, mediation: "optional" } as CredentialRequestOptions);
    return credential && credential.type === "password" ? (credential as StoredPasswordCredential) : null;
  } catch {
    return null;
  }
}

/**
 * Explicitly offer the credentials to the browser's password manager. A real <form>
 * with autocomplete hints is enough for most browsers, but in an SPA there's no page
 * navigation after submit, so Chromium may not show its "Save password?" prompt
 * unless we hand it the credential directly.
 */
async function offerToSaveCredential(email: string, password: string) {
  try {
    if (window.PasswordCredential && navigator.credentials?.store) {
      await navigator.credentials.store(new window.PasswordCredential({ id: email, password }));
    }
  } catch {
    // Unsupported or user dismissed — not worth surfacing.
  }
}

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBER_KEY) !== "false");

  useEffect(() => {
    if (!remember) return;
    let cancelled = false;
    getSavedCredential().then((credential) => {
      if (cancelled || !credential) return;
      setEmail(credential.id);
      setPassword(credential.password);
    });
    return () => {
      cancelled = true;
    };
    // Only on first load — not every time the checkbox is toggled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
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
      await signIn(email, password, remember);
      localStorage.setItem(REMEMBER_KEY, String(remember));
      if (remember) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      if (remember) await offerToSaveCredential(email, password);
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

        {/* A real <form> with name/autocomplete hints so browser password managers
            recognise it, autofill saved credentials and offer to save new ones. */}
        <form onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Work email"
            name="username"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            autoFocus={!!localStorage.getItem(REMEMBERED_EMAIL_KEY)}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            helperText={error}
            sx={{ mb: 1 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
            label="Remember me"
            sx={{ mb: 1.5, "& .MuiFormControlLabel-label": { fontSize: 13 } }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting} sx={{ height: 44 }}>
            Sign in
          </Button>
        </form>

        <div style={{ fontSize: 11, color: color.textFaint, marginTop: 20, textAlign: "center" }}>
          Having trouble signing in? Contact your workspace admin.
        </div>
      </div>
    </div>
  );
}
