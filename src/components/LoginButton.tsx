"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      type="button"
      className="btn primary-btn"
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
    >
      Sign in with GitHub
    </button>
  );
}