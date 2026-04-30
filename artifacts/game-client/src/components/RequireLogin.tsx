import { useEffect } from "react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Redirects to the login page if the user has not entered their nick. */
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const isLoggedIn = Boolean(localStorage.getItem("player_nick"));

  useEffect(() => {
    if (!isLoggedIn) {
      window.location.replace(`${base}/`);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;

  return <>{children}</>;
}
