import * as React from "react";
import { api } from "../utils/api";

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ssoToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  // Set domain to .asiradnan.com to share across subdomains
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;domain=.asiradnan.com;secure;samesite=strict`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.asiradnan.com;`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [ssoToken, setSsoToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClient, setIsClient] = React.useState(false);

  // Ensure we're on the client side before accessing localStorage/cookies
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!isClient) return;

    // Check for token in cookie first, then localStorage as fallback
    let token = getCookie("sso_token");
    if (!token) {
      token = localStorage.getItem("sso_token");
      // If found in localStorage, migrate to cookie
      if (token) {
        setCookie("sso_token", token);
        localStorage.removeItem("sso_token");
      }
    }

    console.log("Token from storage:", token);
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, [isClient]);

  const verifyToken = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await api.verifyToken(token);
      console.log("Token verification response:", response);

      if (response.valid || response.success) {
        setUser(response.user);
        setSsoToken(token);
        if (isClient) {
          setCookie("sso_token", token);
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!ssoToken) return;

    try {
      const response = await api.getUserProfile(ssoToken);
      setUser(response.user || response);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      // If token is invalid, logout
      if (error instanceof Error && error.message.includes("401")) {
        logout();
      }
    }
  };

  const login = (token: string) => {
    setSsoToken(token);
    if (isClient) {
      setCookie("sso_token", token);
    }
    verifyToken(token);
  };

  const logout = () => {
    setUser(null);
    setSsoToken(null);
    if (isClient) {
      deleteCookie("sso_token");
      // Also clear localStorage as fallback
      localStorage.removeItem("sso_token");
    }
    setIsLoading(false);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    ssoToken,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
