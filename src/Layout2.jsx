import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, Users, Map, TreePine, 
  CloudOff, Menu, X, ChevronRight, Shield, Wifi, WifiOff, RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPendingSyncCount, isOnline } from "@/components/common/OfflineStorage";

function SyncIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(getPendingSyncCount());

  useEffect(() => {
    // const handleOnline = () => setOnline(true);
    // const handleOffline = () => setOnline(false);
    const handleOnline = () => navigator.onLine;
    const handleOffline = () => !navigator.onLine;
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
      setPendingCount(getPendingSyncCount());
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
      online ? "bg-emerald-50" : "bg-amber-50"
    }`}>
      {online ? (
        <Wifi className="w-5 h-5 text-emerald-600" />
      ) : (
        <WifiOff className="w-5 h-5 text-amber-600" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${online ? "text-emerald-700" : "text-amber-700"}`}>
          {online ? "Online" : "Offline"}
        </p>
        <p className={`text-xs truncate ${online ? "text-emerald-600" : "text-amber-600"}`}>
          {pendingCount > 0 ? `${pendingCount} data menunggu sync` : "Data tersinkronisasi"}
        </p>
      </div>
    </div>
  );
}

const navigation = [
  { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { name: "Petani", page: "Farmers", icon: Users },
  { name: "Lahan", page: "Lands", icon: Map },
  { name: "Tanaman", page: "Plants", icon: TreePine },
  { name: "Produktivitas", page: "ProductivityMonitoring", icon: LayoutDashboard },
  { name: "Facilitator", page: "Validators", icon: Shield },
  { name: "Offtaker", page: "Offtakers", icon: Users },
  { name: "Portal Petani", page: "FarmerPortal", icon: Users },
  { name: "Portal Validator", page: "ValidatorPortal", icon: Shield },
  { name: "Portal Offtaker", page: "OfftakerPortal", icon: Users },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isActivePage = (pageName) => {
    return currentPageName === pageName || location.pathname.includes(pageName.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">AgroMonev</span>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <TreePine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">AgroMonev</h1>
                <p className="text-xs text-slate-500">Monitoring Pertanian</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = isActivePage(item.page);
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-emerald-50 text-emerald-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto text-emerald-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sync Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <SyncIndicator />
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}