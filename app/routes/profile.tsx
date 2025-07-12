import * as React from "react";
import Profile from "../components/Profile";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router";
import type { Route } from "./+types/profile";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - WebAuthn SSO" },
    {
      name: "description",
      content: "View your user profile and SSO token information.",
    },
  ];
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing while loading
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="h-12 w-12 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mt-10">
            <Profile />
          </div>
        </div>
      </div>
    </Layout>
  );
}
