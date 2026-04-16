import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmptyState from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TreePine, Search, Filter, MapPin, Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { entity } from "@/api/entities";

const statusColors = {
  alive: "bg-emerald-100 text-emerald-700 border-emerald-200",
  sick: "bg-amber-100 text-amber-700 border-amber-200",
  dead: "bg-slate-100 text-slate-600 border-slate-200",
  harvested: "bg-blue-100 text-blue-700 border-blue-200"
};

const statusLabels = {
  alive: "Hidup",
  sick: "Sakit",
  dead: "Mati",
  harvested: "Dipanen"
};

export default function Plants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [commodityFilter, setCommodityFilter] = useState("all");

  const { data: rawplants = [], isLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: async() => {
      const rawData = await entity('map', 'tanaman').list();
      const data = Array.isArray(rawData?.data) ? rawData?.data : Array.isArray(rawData?.data?.data) ? rawData?.data?.data: [];
      
      return data;
    }
  });

  const { data: rawlands = [] } = useQuery({
    queryKey: ["lands"],
    queryFn: async() => {
      const rawData = await entity('map', 'lahan').list();
      const data = Array.isArray(rawData?.data) ? rawData?.data : Array.isArray(rawData?.data?.data) ? rawData?.data?.data : [];
      return data;
    }
  });

  const { data: rawfarmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: async() => await entity('auth', 'profile').list()
  });

  const lands = Array.isArray(rawlands) ? rawlands : [];
  const farmers = Array.isArray(rawfarmers) ? rawfarmers : [];
  const plants = Array.isArray(rawplants) ? rawplants : [];

  // const landMap = lands.reduce((acc, l) => ({ ...acc, [l.id]: l }), {});
  // const farmerMap = farmers.reduce((acc, f) => ({ ...acc, [f.id]: f.full_name }), {});

  const landMap = useMemo(() => {
    const map = {};
    lands.forEach(l => { if (l?.id) map[l.id] = l; });
    return map;
  }, [lands]);

  const farmerMap = useMemo(() => {
    const map = {};
    farmers.forEach(f => { if (f?.id) map[f.id] = f.full_name; });
    return map;
  }, [farmers]);

  const commodities = useMemo(() => 
    [...new Set(plants.map(p => p.commodity_name).filter(Boolean))],
  [plants]);
  
  // const commodities = [...new Set(plants.map(p => p.commodity_name).filter(Boolean))];

  // const filteredPlants = plants.filter(plant => {
  //   const matchSearch = !search || 
  //     plant.commodity_name?.toLowerCase().includes(search.toLowerCase()) ||
  //     landMap[plant.land_id]?.name?.toLowerCase().includes(search.toLowerCase()) ||
  //     farmerMap[plant.farmer_id]?.toLowerCase().includes(search.toLowerCase());
    
  //   const matchStatus = statusFilter === "all" || plant.status === statusFilter;
  //   const matchCommodity = commodityFilter === "all" || plant.commodity_name === commodityFilter;

  //   return matchSearch && matchStatus && matchCommodity;
  // });
  
  const filteredPlants = useMemo(() => {
    const searchTerm = search.toLowerCase();
    return plants.filter(plant => {
      if (!plant) return false;

      const matchSearch = !search || 
        plant.commodity_name?.toLowerCase().includes(searchTerm) ||
        landMap[plant.land_id]?.nama?.toLowerCase().includes(searchTerm) ||
        farmerMap[plant.farmer_id]?.toLowerCase().includes(searchTerm);
      
      const matchStatus = statusFilter === "all" || plant.status === statusFilter;
      const matchCommodity = commodityFilter === "all" || plant.commodity_name === commodityFilter;

      return matchSearch && matchStatus && matchCommodity;
    });
  }, [plants, search, statusFilter, commodityFilter, landMap, farmerMap]);

  // Group by commodity
  // const groupedByCommodity = filteredPlants.reduce((acc, plant) => {
  //   const key = plant.commodity_name || "Lainnya";
  //   if (!acc[key]) acc[key] = [];
  //   acc[key].push(plant);
  //   return acc;
  // }, {});

  const groupedByCommodity = useMemo(() => {
    const groups = {};
    filteredPlants.forEach(plant => {
      const key = plant?.nama || plant?.commodity_name || "Lainnya";
      if (!groups[key]) groups[key] = [];
      groups[key].push(plant);
    });
    return groups;
  }, [filteredPlants]);

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
            <h1 className="text-3xl font-bold text-slate-900">Daftar Tanaman</h1>
            <p className="text-slate-500">{plants.length} tanaman terdaftar</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{plants.filter(p => p.status === "alive").length}</p>
                <p className="text-sm text-slate-500">Hidup</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{plants.filter(p => p.status === "sick" || p.productivity_status === "less_productive").length}</p>
                <p className="text-sm text-slate-500">Sakit</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{plants.filter(p => p.status === "harvested").length}</p>
                <p className="text-sm text-slate-500">Dipanen</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{plants.filter(p => p.status === "dead").length}</p>
                <p className="text-sm text-slate-500">Mati</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari komoditas, lahan, atau petani..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-11 bg-white border-0 shadow-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 h-11 bg-white border-0 shadow-sm">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="alive">Hidup</SelectItem>
              <SelectItem value="sick">Sakit</SelectItem>
              <SelectItem value="harvested">Dipanen</SelectItem>
              <SelectItem value="dead">Mati</SelectItem>
            </SelectContent>
          </Select>
          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger className="w-full md:w-48 h-11 bg-white border-0 shadow-sm">
              <SelectValue placeholder="Komoditas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Komoditas</SelectItem>
              {commodities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Plants List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredPlants.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {Object.entries(groupedByCommodity).map(([commodity, commodityPlants]) => (
              <div key={commodity}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TreePine className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{commodity}</h3>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                    {commodityPlants.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {commodityPlants.map((plant, idx) => {
                    const land = landMap[plant.lahan.id];
                    return (
                      <motion.div
                        key={plant.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all p-4 bg-white group">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                plant.kondisi_tanaman === "alive" ? "bg-emerald-500" :
                                plant.status === "sick" ? "bg-amber-500" :
                                plant.status === "harvested" ? "bg-blue-500" : "bg-emerald-400"
                              }`} />
                              <Badge className={`${statusColors[plant.status ?? 'alive']} border text-xs font-medium`}>
                                {statusLabels[plant.status ?? 'alive']}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="truncate">{land?.nama || land?.name || "Lahan tidak diketahui"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>{plant.created_at ? format(new Date(plant.created_at), "dd MMM yyyy") : "-"}</span>
                            </div>
                          </div>

                          {land && (
                            <Link to={createPageUrl("LandDetail") + `?id=${land.id}`}>
                              <Button variant="ghost" size="sm" className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600">
                                Lihat Lahan
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <EmptyState
            icon={TreePine}
            title="Tidak ada tanaman ditemukan"
            description={search || statusFilter !== "all" || commodityFilter !== "all"
              ? "Coba ubah filter pencarian Anda" 
              : "Tanaman dapat ditambahkan melalui halaman detail lahan"}
          />
        )}
      </div>
    </div>
  );
}