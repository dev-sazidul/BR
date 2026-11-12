"use client";

import { useEffect, useState } from "react";

export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <p role="status" className="bg-ink px-4 py-2 text-center text-sm text-paper">
      You are offline. Pages you already opened can still be viewed. Background removal needs a connection.
    </p>
  );
}
