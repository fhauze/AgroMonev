import { useSyncManager } from "./SyncManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, CloudOff, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { isOnline } from "../../services/networkService";
import { useEffect, useState } from "react";
import { OfflineService } from "./offlineStorage";

export default function SyncStatusBar({ compact = false }) {
  const { syncing, lastSync, forceSync } = useSyncManager();
  const [online, setOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState()

  useEffect(() => {
     const controller = new AbortController();

    const check = async () => {
      try {
        const [status, pending] = await Promise.all([
          isOnline(),
          OfflineService.getPendingCount()
        ]);
        setPendingCount(pending)
        setOnline(status);
      } catch {}
    };

    check();

    const interval = setInterval(check, 5000);

    return () => {
      controller.abort(),
      clearInterval(interval)
    };
  }, [pendingCount]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {online ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        )}
        {pendingCount > 0 && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CloudOff className="w-3 h-3 mr-1" />
            {pendingCount} pending
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          online ? "bg-emerald-100" : "bg-amber-100"
        }`}>
          {online ? (
            <Wifi className="w-5 h-5 text-emerald-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-slate-900">
            {online ? "Terhubung ke Internet" : "Mode Offline"}
          </p>
          <p className="text-xs text-slate-500">
            {lastSync 
              ? `Sync terakhir: ${format(new Date(lastSync), "dd MMM, HH:mm", { locale: id })}`
              : "Belum pernah sync"
            }
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            {pendingCount} data menunggu sync
          </Badge>
        )}
        {syncing ? (
          <Button disabled size="sm" variant="outline">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Syncing...
          </Button>
        ) : online && pendingCount > 0 ? (
          <Button size="sm" onClick={forceSync} className="bg-emerald-600 hover:bg-emerald-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Sekarang
          </Button>
        ) : online ? (
          <Badge className="bg-emerald-100 text-emerald-700">
            <Check className="w-3 h-3 mr-1" />
            Tersinkronisasi
          </Badge>
        ) : null}
      </div>
    </div>
  );
}