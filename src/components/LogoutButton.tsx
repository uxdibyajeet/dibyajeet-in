"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      className="btn secondary-btn"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      log out
    </button>
  );
}