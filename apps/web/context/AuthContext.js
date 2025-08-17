// context/AuthContext.js
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";
import { useRouter } from "next/router";
import jwtDecode from "jwt-decode";
// import CryptoJS from "crypto-js"; // Uncomment if using encryption

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const errorMap = {
  400: "Invalid request format",
  401: "Session expired - please login again",
  403: "You don't have permission for this action",
  404: "Resource not found",
  429: "Too many requests - try again later",
  500: "Our servers are busy - please try again",
};

// Optional encryption layer
// const encrypt = (val) => CryptoJS.AES.encrypt(val, process.env.NEXT_PUBLIC_CRYPTO_SECRET).toString();
// const decrypt = (val) => CryptoJS.AES.decrypt(val, process.env.NEXT_PUBLIC_CRYPTO_SECRET).toString(CryptoJS.enc.Utf8);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutWarning, setLogoutWarning] = useState(false);
  const router = useRouter();

  const publicRoutes = ["/login", "/register", "/reset-password", "/forgot-password"];

  // Token utils
  const checkTokenValid = useCallback((token) => {
    try {
      return jwtDecode(token).exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }, []);

  const validateUserData = useCallback((data) =>
    ["id", "email"].every((k) => data?.[k]) ? data : null,
    []
  );

  const getStoredToken = () => {
    try {
      return localStorage.getItem("token"); // Replace with decrypt() if needed
    } catch {
      return null;
    }
  };

  const storeToken = (newToken) => {
    try {
      localStorage.setItem("token", newToken); // Replace with encrypt() if needed
    } catch (err) {
      console.error("Failed to store token:", err);
    }
  };

  // API
  const fetchUser = useCallback(async (token, signal) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return validateUserData(data.user || {});
  }, [validateUserData]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setLogoutWarning(false);
    router.push("/login");
  }, [token, router]);

  const rehydrateUser = useCallback(async (newToken, signal) => {
    const userData = await fetchUser(newToken, signal);
    setToken(newToken);
    setUser(userData);
  }, [fetchUser]);

  // Initial auth load
  useEffect(() => {
    const controller = new AbortController();
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken || !checkTokenValid(storedToken)) {
        return setLoading(false);
      }
      try {
        await rehydrateUser(storedToken, controller.signal);
      } catch {
        if (!controller.signal.aborted) logout();
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    initAuth();
    return () => controller.abort();
  }, [checkTokenValid, rehydrateUser, logout]);

  // Route guard
  useEffect(() => {
    if (loading || publicRoutes.includes(router.pathname)) return;
    if (!user) router.push("/login");
  }, [user, loading, router]);

  // Cross-tab sync
  useEffect(() => {
    const sync = async (e) => {
      if (e.key !== "token") return;
      const controller = new AbortController();
      try {
        const newToken = getStoredToken();
        newToken && checkTokenValid(newToken)
          ? await rehydrateUser(newToken, controller.signal)
          : logout();
      } catch {
        if (!controller.signal.aborted) logout();
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [checkTokenValid, rehydrateUser, logout]);

  // Background refresh
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      checkTokenValid(token)
        ? fetchUser(token).catch(logout)
        : logout();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, checkTokenValid, fetchUser, logout]);

  // Session timeout
  useEffect(() => {
    if (!token) return;
    let warnTimer, logoutTimer;

    const resetTimers = () => {
      clearTimeout(warnTimer);
      clearTimeout(logoutTimer);
      warnTimer = setTimeout(() => setLogoutWarning(true), 25 * 60 * 1000);
      logoutTimer = setTimeout(logout, 30 * 60 * 1000);
      setLogoutWarning(false);
    };

    ["mousemove", "keydown", "click", "scroll"].forEach((e) =>
      window.addEventListener(e, resetTimers)
    );
    resetTimers();

    return () => {
      clearTimeout(warnTimer);
      clearTimeout(logoutTimer);
      ["mousemove", "keydown", "click", "scroll"].forEach((e) =>
        window.removeEventListener(e, resetTimers)
      );
    };
  }, [token, logout]);

  // Auth API wrapper
  const authFetch = useCallback(async (endpoint, body) => {
    const controller = new AbortController();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        return {
          success: false,
          error: data.error || errorMap[res.status] || "Unexpected error",
        };
      }

      storeToken(data.token);
      window.dispatchEvent(new StorageEvent("storage", {
        key: "token",
        newValue: data.token,
      }));

      await rehydrateUser(data.token, controller.signal);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.name === "AbortError" ? "Request cancelled" : "Network error",
      };
    } finally {
      controller.abort();
    }
  }, [rehydrateUser, storeToken]);

  const validatePassword = useCallback((pwd) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/.test(pwd),
    []
  );

  const login = (email, password) => authFetch("login", { email, password });

  const register = async (email, password) => {
    if (!validatePassword(password)) {
      return {
        success: false,
        error: "Password must be 10+ characters with uppercase, lowercase, number, and symbol",
      };
    }
    return authFetch("register", { email, password });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      logoutWarning,
      login,
      register,
      logout,
      requestPasswordReset: (email) => authFetch("forgot-password", { email }),
      resetPassword: (resetToken, newPassword) => authFetch("reset-password", { resetToken, newPassword }),
      verify2FA: (code) => authFetch("verify-2fa", { code })
    }}>
      {children}
    </AuthContext.Provider>
  );
};

