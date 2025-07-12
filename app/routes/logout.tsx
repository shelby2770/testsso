import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { redirect } from "react-router";
import type { Route } from "./+types/logout";

export async function loader() {
  return redirect("/");
}

export default function Logout() {
  const { logout } = useAuth();

  React.useEffect(() => {
    logout();
    // No need to navigate here as the loader will handle it
  }, [logout]);

  return null; // This component doesn't render anything
}
