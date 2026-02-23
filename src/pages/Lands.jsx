  import { useMemo, useState } from "react";
  import { useQuery } from "@tanstack/react-query";
  import { base44 } from "@/api/Client";
  import { Link } from "react-router-dom";
  import { createPageUrl } from "@/utils";
  import LandCard from "@/components/lands/LandCard";
  import LandMap from "@/components/lands/LandMap";
  import EmptyState from "@/components/common/EmptyState";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Map as MapIcon, Plus, Search, Filter, LayoutGrid, MapPinned } from "lucide-react";
  import { motion } from "framer-motion";
import { OfflineService } from "@/components/common/offlineStorage";

  export default function Lands() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [view, setView] = useState("grid");

    // const { data: rawlands = [], isLoading } = useQuery({
    //   queryKey: ["lands"],
    //   queryFn: () => base44.entities.Land.list("-created_date")
    // });
    const { data: rawlands = [], isLoading } = useQuery({
      queryKey: ["lands"],
      queryFn: async () => {
        let serverData = [];
        try {
          // Tambahkan timeout atau handle jika return HTML
          const resp = await base44.entities.Land.list("-created_date");
          if (Array.isArray(resp)) serverData = resp;
        } catch (e) { 
          console.warn("Server lands offline/error"); 
        }

        const localData = await OfflineService.getEntities("lands");
        
        // Gabungkan dengan cerdas
        const combined = new Map();
        // Masukkan data server dulu
        serverData.forEach(l => { if(l.id) combined.set(l.id, l); });
        // Masukkan data lokal (akan menimpa data server jika ID sama, bagus untuk sinkronisasi)
        localData.forEach(l => { if(l.id) combined.set(l.id, l); });

        const result = Array.from(combined.values());
        console.log("🔍 Total Lands Loaded (Server + Local):", result.length);
        return result;
      }
    });

    // const { data: rawfarmers = [] } = useQuery({
    //   queryKey: ["farmers"],
    //   queryFn: () => base44.entities.Farmer.list()
    // });

    const { data: rawfarmers = [] } = useQuery({
      queryKey: ["farmers"],
      queryFn: async () => {
        let serverData = [];
        try {
          const resp = await base44.entities.Farmer.list();
          serverData = Array.isArray(resp) ? resp : [];
        } catch (e) { }
        const localData = await OfflineService.getEntities("farmers");
        const combined = new Map();
        serverData.forEach(f => combined.set(f.id, f));
        localData.forEach(f => combined.set(f.id, f));
        return Array.from(combined.values());
      }
    });

    const { data: rawplants = [] } = useQuery({
      queryKey: ["plants"],
      queryFn: () => base44.entities.Plant.list()
    });

    const lands = Array.isArray(rawlands) ? rawlands : [];
    const farmers = Array.isArray(rawfarmers) ? rawfarmers : [];
    const plants = Array.isArray(rawplants) ? rawplants : [];

    const farmerMap = useMemo(() => {
      const map = {};
      farmers.forEach(f => {
        if (f?.id) map[f.id] = f.full_name;
      });
      return map;
    }, [farmers]);

    // const filteredLands = lands.filter(land => {
    //   const matchSearch = !search || 
    //     land.name?.toLowerCase().includes(search.toLowerCase()) ||
    //     land.village?.toLowerCase().includes(search.toLowerCase()) ||
    //     farmerMap[land.farmer_id]?.toLowerCase().includes(search.toLowerCase());
      
    //   const matchStatus = statusFilter === "all" || land.validation_status === statusFilter;

    //   return matchSearch && matchStatus;
    // });

    const filteredLands = useMemo(() => {
      // Pastikan lands adalah array sebelum filter
      if (!Array.isArray(lands)) return [];

      return lands.filter(land => {
        if (!land) return false;

        const landName = land.name?.toLowerCase() || "";
        const village = land.village?.toLowerCase() || "";
        const farmerName = farmerMap[land.farmer_id]?.toLowerCase() || "";
        const searchTerm = search.toLowerCase();

        const matchSearch = !search || 
          landName.includes(searchTerm) ||
          village.includes(searchTerm) ||
          farmerName.includes(searchTerm);
        
        const matchStatus = statusFilter === "all" || land.validation_status === statusFilter;
        const match = matchSearch && matchStatus;
        if (!match && search === "") {
          console.log("Data ada tapi tidak lolos status filter:", land);
        }

        return match;
      });
    }, [lands, search, statusFilter, farmerMap]);

    const plantCountMap = useMemo(() => {
        const map = {};
        plants.forEach(p => {
          if (p?.land_id) {
            map[p.land_id] = (map[p.land_id] || 0) + 1;
          }
        });
        return map;
      }, [plants]);
      
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pemetaan Lahan</h1>
              <p className="text-slate-500">{lands.length} lahan terdaftar</p>
            </div>
            <Link to={createPageUrl("LandRegister")}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 h-11">
                <Plus className="w-5 h-5 mr-2" />
                Tambah Lahan
              </Button>
            </Link>
          </motion.div>

          {/* Filters & View Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama lahan, desa, atau petani..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-11 bg-white border-0 shadow-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 h-11 bg-white border-0 shadow-sm">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Validasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="valid">Tervalidasi</SelectItem>
                <SelectItem value="invalid">Tidak Valid</SelectItem>
                <SelectItem value="need_review">Perlu Review</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex bg-white rounded-lg shadow-sm p-1">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("grid")}
                className={view === "grid" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={view === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("map")}
                className={view === "map" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                <MapPinned className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          ) : view === "map" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <LandMap 
                lands={filteredLands} 
                plants={plants}
                readOnly={true}
                center={lands.length > 0 ? [lands[0].center_lat || -6.2, lands[0].center_lng || 106.8] : [-6.2, 106.8]}
                zoom={10}
              />
            </motion.div>
          ) : filteredLands.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredLands.map((land, idx) => (
                <motion.div
                  key={land.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <LandCard 
                    land={land} 
                    farmerName={farmerMap[land.farmer_id]}
                    plantCount={plants.filter(p => p.land_id === land.id).length}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={MapIcon}
              title="Tidak ada lahan ditemukan"
              description={search || statusFilter !== "all" 
                ? "Coba ubah filter pencarian Anda" 
                : "Mulai dengan mendaftarkan lahan baru"}
              action={() => window.location.href = createPageUrl("LandRegister")}
              actionLabel="Tambah Lahan Pertama"
            />
          )}
        </div>
      </div>
    );
  }