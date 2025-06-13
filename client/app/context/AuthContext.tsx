import * as React from "react";
import { verifySSOToken } from "../utils/webauthn";
import { api } from "../utils/api";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ssoToken: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [ssoToken, setSsoToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Check for token in localStorage on initial load
    const token = localStorage.getItem("sso_token");
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await verifySSOToken(token);
      if (response.valid) {
        setUser(response.user);
        setSsoToken(token);
        localStorage.setItem("sso_token", token);
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

  const login = (token: string) => {
    setSsoToken(token);
    localStorage.setItem("sso_token", token);
    verifyToken(token);
  };

  const logout = () => {
    setUser(null);
    setSsoToken(null);
    localStorage.removeItem("sso_token");
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    ssoToken,
    login,
    logout,
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
