import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { base44 } from "@/api/Client";
import { pagesConfig } from "@/pages.config";

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { Pages, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];

  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const pathname = location.pathname;
    let pageName;

    if (pathname === "/" || pathname === "") {
      pageName = mainPageKey;
    } else {
      const segment = pathname.replace(/^\//, "").split("/")[0];
      const matchedKey = Object.keys(Pages).find(
        k => k.toLowerCase() === segment.toLowerCase()
      );
      pageName = matchedKey ?? null;
    }

    if (isAuthenticated && pageName) {
      setTracking(true);

      base44.appLogs
        .logUserInApp(pageName)
        .finally(() => {
          setTimeout(() => setTracking(false), 600);
        });
    }
  }, [location.pathname]);

  if (!tracking) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs shadow-lg">
      Mencatat aktivitas halaman…
    </div>
  );
}
