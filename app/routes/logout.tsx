import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { redirect } from "react-router";
import type { Route } from "./+types/logout";

export function loader() {
  return redirect("/");
}

export default function Logout() {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(true);

  React.useEffect(() => {
    if (isLoggingOut) {
      logout();
      window.location.href = "/";
    }
  }, [logout, isLoggingOut]);

  return null;
}
