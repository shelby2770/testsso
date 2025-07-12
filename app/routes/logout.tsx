import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { redirect } from "react-router";
import type { Route } from "./+types/logout";

export function loader() {
  return redirect("/");
}

export default function Logout() {
  const { logout } = useAuth();

  React.useEffect(() => {
    // Call logout to clear auth state
    logout();

    // Force a complete page refresh to clear all React state
    window.location.replace("/");
  }, [logout]);

  return null;
}
