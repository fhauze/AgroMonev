import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FarmerCard from "@/components/farmers/FarmerCard";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { OfflineService } from "@/components/common/offlineStorage";

export default function Farmers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const { data: farmers = [], isLoading } = useQuery({
    queryKey: ["farmers"],
    queryFn: async () => {
      let serverData;
      try {
        serverData = await entity("auth","users").list();
      } catch (err) {
        console.warn("Server unreachable, loading local data only");
      }
      const localData = await OfflineService.getEntities("farmers");
      const combined = new Map();

      safeArray(serverData).forEach(f => combined.set(f.id, f));
      safeArray(localData).forEach(f => combined.set(f.id, f));
      
      return Array.from(combined.values()).sort((a, b) => 
        new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at)
      );
    }
  });

  const safeArray = (v) => Array.isArray(v) ? v : [];
  const farmersSafe = safeArray(farmers);
  // Get unique regions
  const regions = [...new Set(farmersSafe.map(f => f.regency).filter(Boolean))];

  // Filter farmers
  const filteredFarmers = farmersSafe.filter(farmer => {
    const matchSearch = !search || 
      farmer.full_name?.toLowerCase().includes(search.toLowerCase()) || farmer.nama?.toLowerCase().includes(search.toLowerCase()) ||
      farmer.nik?.includes(search) || farmer.kk?.includes(search) || farmer.ktp?.includes(search) || 
      farmer.farmer_group?.toLowerCase().includes(search.toLowerCase());
      
    const currentStatus = farmer.user.email_verified_at !== null || farmer.user.email_verified_at !== undefined ? 'verified' : 'pending';

    const matchStatus = statusFilter === "all" || currentStatus === statusFilter;
    
    const matchRegion = regionFilter === "all" || farmer.regency === regionFilter;
    console.log("status filter => ", matchStatus, farmer.user.email_verified_at, statusFilter);
    return matchSearch && matchStatus && matchRegion;
  });

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
            <h1 className="text-3xl font-bold text-slate-900">Daftar Petani</h1>
            <p className="text-slate-500">{farmers.length} petani terdaftar</p>
          </div>
          <Link to={createPageUrl("FarmerRegister")}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-11">
              <Plus className="w-5 h-5 mr-2" />
              Tambah Petani
            </Button>
          </Link>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari nama, NIK, atau kelompok tani..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-11 bg-white border-0 shadow-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 h-11 bg-white border-0 shadow-sm">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Terverifikasi</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full md:w-48 h-11 bg-white border-0 shadow-sm">
              <SelectValue placeholder="Kabupaten" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kabupaten</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Farmers List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredFarmers.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredFarmers.map((farmer, idx) => (
              <motion.div
                key={farmer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <FarmerCard farmer={farmer} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState
            icon={Users}
            title="Tidak ada petani ditemukan"
            description={search || statusFilter !== "all" || regionFilter !== "all" 
              ? "Coba ubah filter pencarian Anda" 
              : "Mulai dengan mendaftarkan petani baru"}
            action={() => window.location.href = createPageUrl("FarmerRegister")}
            actionLabel="Tambah Petani Pertama"
          />
        )}
      </div>
    </div>
  );
}