import { useState, useEffect, useCallback } from "react";

type Route = "/" | "/login" | "/app" | "/reset-password";

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === "/login") return "/login";
  if (path === "/app") return "/app";
  if (path === "/reset-password") return "/reset-password";
  return "/";
}

/**
 * Minimal SPA router backed by the History API.
 * Supports four routes: "/" (landing), "/login" (auth), "/app" (main app),
 * "/reset-password" (landed on from the password-reset email link).
 */
export function useRoute() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const navigate = useCallback((to: Route) => {
    window.history.pushState(null, "", to);
    setRoute(to);
  }, []);

  return { route, navigate };
}
