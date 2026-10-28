import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";

/**
 * Real login: email + password checked against accounts in the database (see
 * DeliveryHub.Api's AuthController), returning a signed JWT carrying the user's role
 * (Owner | Viewer). This is independent of the Microsoft Entra ID plan noted in the
 * architecture doc (still pending a tenant ID) — when that lands, only how the token
 * is obtained changes; everything downstream (role gating, api/client.ts's Authorization
 * header) stays the same.
 */

export interface AuthUser {
  token: string;
  email: string;
  name: string;
  role: "Owner" | "Viewer";
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored token has been checked against the server at least once. */
  loading: boolean;
  /** `remember` keeps the session across browser restarts (localStorage) instead of
   *  only for this browser session (sessionStorage). */
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export const STORAGE_KEY = "deliveryhub.authUser";

function readStoredUser(): AuthUser | null {
  const stored = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as AuthUser) : null;
}

function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer so the very first render already has the stored user — an
  // effect-based read would run after RequireAuth's first check and cause a
  // flash-redirect to /signin on every full page load/refresh. The token is then
  // re-validated against the server below (it may have expired since last visit).
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .get<{ email: string; displayName: string; role: "Owner" | "Viewer" }>("/api/auth/me")
      .then(() => setLoading(false))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearStoredUser();
          setUser(null);
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string, remember: boolean) => {
    const response = await api.post<{ token: string; email: string; name: string; role: "Owner" | "Viewer" }>(
      "/api/auth/login",
      { email, password, rememberMe: remember },
    );
    const next: AuthUser = response;
    clearStoredUser();
    (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  };

  const signOut = () => {
    clearStoredUser();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
