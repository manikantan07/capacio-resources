const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5080";
const AUTH_STORAGE_KEY = "deliveryhub.authUser";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// This module can't use the React AuthContext directly, so it reads the same
// localStorage key AuthContext writes to (STORAGE_KEY there) to attach the bearer
// token every request needs.
function authHeader(): Record<string, string> {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = stored ? (JSON.parse(stored) as { token?: string }).token : undefined;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader(), ...init?.headers },
  });

  if (res.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/me") {
    // Token missing/expired/invalid — drop it and send the user back to sign in.
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (location.hash !== "#/signin") location.hash = "#/signin";
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.title ?? body.message ?? message;
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
