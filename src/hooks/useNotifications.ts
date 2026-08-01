/**
 * useNotifications — thin wrapper around the Web Notifications API.
 *
 * • Requests permission lazily (only when the user first enables it).
 * • Persists the user's opted-in preference to localStorage so the toggle
 *   survives page reloads without prompting again.
 * • Exposes a `notify(title, opts?)` helper that is a no-op when the user
 *   has not granted permission or has opted out.
 */

import { useCallback, useEffect, useState } from "react";

const LS_KEY = "pf_notifications_enabled";

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Fire a desktop notification. Safe to call even if permission is not yet granted — it will silently no-op. */
export function fireNotification(title: string, opts?: NotificationOptions): void {
  if (!isSupported() || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    silent: false,
    ...opts,
  });
  // Auto-close after 6 s so it doesn't pile up.
  setTimeout(() => n.close(), 6000);
}

interface UseNotificationsReturn {
  supported: boolean;
  /** Current browser permission state */
  permission: NotificationPermission | "unsupported";
  /** Whether the user has opted in inside the app */
  enabled: boolean;
  /** Request permission and opt-in.  Returns the resulting permission. */
  enable: () => Promise<NotificationPermission>;
  /** Opt-out (does NOT revoke browser permission — that's the user's job). */
  disable: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const supported = isSupported();

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported"
  );

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (!supported) return false;
    try {
      return localStorage.getItem(LS_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Keep permission state in sync with the browser (handles external revocation).
  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
    // Some browsers expose a PermissionStatus object that fires change events.
    let status: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((s) => {
        status = s;
        const handler = () => setPermission(Notification.permission);
        s.addEventListener("change", handler);
      })
      .catch(() => {/* permissions API not available */});
    return () => {
      if (status) status.onchange = null;
    };
  }, [supported]);

  const enable = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
      try { localStorage.setItem(LS_KEY, "true"); } catch { /* ignore */ }
    }
    return result;
  }, [supported]);

  const disable = useCallback(() => {
    setEnabled(false);
    try { localStorage.setItem(LS_KEY, "false"); } catch { /* ignore */ }
  }, []);

  return { supported, permission, enabled, enable, disable };
}
