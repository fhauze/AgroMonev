import { Badge } from "@/components/ui/badge";
import { CloudOff, Cloud, AlertCircle, Loader2 } from "lucide-react";

const statusConfig = {
  pending: {
    icon: CloudOff,
    label: "Belum Disinkronkan",
    className: "bg-amber-100 text-amber-700 border-amber-200"
  },
  syncing: {
    icon: Loader2,
    label: "Menyinkronkan...",
    className: "bg-blue-100 text-blue-700 border-blue-200"
  },
  synced: {
    icon: Cloud,
    label: "Tersinkronkan",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  failed: {
    icon: AlertCircle,
    label: "Gagal Sinkronisasi",
    className: "bg-rose-100 text-rose-700 border-rose-200"
  }
};

export default function SyncStatus({ status = "pending", showLabel = true, size = "default" }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} border font-medium ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}>
      <Icon className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} ${showLabel ? "mr-1.5" : ""} ${status === "syncing" ? "animate-spin" : ""}`} />
      {showLabel && config.label}
    </Badge>
  );
}