import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
import StatCard from "@/components/dashboard/StatCard";
import RegionChart from "@/components/dashboard/RegionChart";
import CommodityPieChart from "@/components/dashboard/CommodityPieChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Map, TreePine, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { mockFarmers, mockLands, mockPlants } from '../_mock/data/offlineData'

export default function Dashboard() {
  const productivityLabels = {
    highly_productive: { label: "Sangat Produktif", color: "bg-emerald-100 text-emerald-700" },
    productive: { label: "Produktif", color: "bg-green-100 text-green-700" },
    less_productive: { label: "Kurang Produktif", color: "bg-amber-100 text-amber-700" },
    not_productive: { label: "Tidak Produktif", color: "bg-red-100 text-red-700" }
  };
  const tok = localStorage.getItem('access_token');
  const us = localStorage.getItem('user_data');

  console.log('user data dan token ', tok,us)
  const { data: rawfarmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: async () => {
      const res = await entity('map','tanaman').list();
      return res.data;
    },
    retry: false
  });

  const { data: rawlands = [] } = useQuery({
    queryKey: ["lands"],
    queryFn: () => [],
    retry: false
  });

  const { data: rawplants = [] } = useQuery({
    queryKey: ["plants"],
    queryFn: () => [],
    retry: false
  });

  const farmers = (Array.isArray(rawfarmers) && rawfarmers.length > 0) ? rawfarmers : (mockFarmers || []);
  const lands = (Array.isArray(rawlands) && rawlands.length > 0) ? rawlands : (mockLands || []);
  const plants = (Array.isArray(rawplants) && rawplants.length > 0) ? rawplants : (mockPlants || []);

  const safeFarmers = Array.isArray(farmers) ? farmers : [];
  const safeLands = Array.isArray(lands) ? lands : [];
  const safePlants = Array.isArray(plants) ? plants : [];
  

  // Calculate stats
  // const totalArea = Array.isArray(lands) ? lands.reduce((sum, land) => sum + (land.area_hectares || 0), 0) : 0;
  // const verifiedFarmers = Array.isArray(farmers) ? farmers.filter(f => f.verification_status === "verified").length : 0;
  const validLands = Array.isArray(lands) ? lands.filter(l => l.validation_status === "valid").length : 0;
  const alivePlants = Array.isArray(plants) ? plants.filter(p => p.status === "alive").length : 0;

  const totalArea = safeLands.reduce((sum, land) => sum + (Number(land.area_hectares) || 0), 0);
  const verifiedFarmers = safeFarmers.filter(f => f.verification_status === "verified").length;

  // Region data
  // const regionData = lands.reduce((acc, land) => {
  //   const region = land.regency || "Tidak Diketahui";
  //   const existing = acc.find(r => r.name === region);
  //   if (existing) {
  //     existing.value += land.area_hectares || 0;
  //   } else {
  //     acc.push({ name: region, value: land.area_hectares || 0 });
  //   }
  //   return acc;
  // }, []).sort((a, b) => b.value - a.value).slice(0, 5);

  // new
  const regionData = safeLands.reduce((acc, land) => {
    const region = land.regency || "Tidak Diketahui";
    const existing = acc.find(r => r.name === region);
    if (existing) {
      existing.value += (Number(land.area_hectares) || 0);
    } else {
      acc.push({ name: region, value: (Number(land.area_hectares) || 0) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5);

  // Commodity data
  const commodityData = plants.reduce((acc, plant) => {
    const commodity = plant.commodity_name || "Lainnya";
    const existing = acc.find(c => c.name === commodity);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: commodity, value: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 6);

  // Issues
  const pendingValidation = lands.filter(l => l.validation_status === "pending" || l.validation_status === "need_review").length;
  const unverifiedFarmers = farmers.filter(f => f.verification_status === "pending").length;
  const sickPlants = plants.filter(p => p.status === "sick" || p.productivity_status === "less_productive" || p.productivity_status === "not_productive").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Monev</h1>
          <p className="text-slate-500">Monitoring & Evaluasi Pertanian Wilayah</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          <StatCard
            title="Total Petani"
            value={farmers.length}
            subtitle={`${verifiedFarmers} terverifikasi`}
            icon={Users}
            trend={verifiedFarmers > 0 ? `${Math.round(verifiedFarmers/farmers.length*100)}% verified` : undefined}
            trendUp={true}
          />
          <StatCard
            title="Total Lahan"
            value={lands.length}
            subtitle={`${validLands} tervalidasi`}
            icon={Map}
          />
          <StatCard
            title="Luas Total"
            value={`${totalArea.toFixed(1)} Ha`}
            subtitle="Area terdata"
            icon={BarChart3}
          />
          <StatCard
            title="Jumlah Tanaman"
            value={plants.length}
            subtitle={`${alivePlants} hidup`}
            icon={TreePine}
          />
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RegionChart data={regionData} title="Luas Lahan per Wilayah (Ha)" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CommodityPieChart data={commodityData} title="Distribusi Komoditas" />
          </motion.div>
        </div>

        {/* Issues & Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Perlu Perhatian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-800">Lahan Pending</span>
                    <span className="text-2xl font-bold text-amber-600">{pendingValidation}</span>
                  </div>
                  <p className="text-xs text-amber-600">Perlu validasi wilayah</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Petani Pending</span>
                    <span className="text-2xl font-bold text-blue-600">{unverifiedFarmers}</span>
                  </div>
                  <p className="text-xs text-blue-600">Menunggu verifikasi</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-rose-800">Tanaman Sakit</span>
                    <span className="text-2xl font-bold text-rose-600">{sickPlants}</span>
                  </div>
                  <p className="text-xs text-rose-600">Perlu inspeksi lapangan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Aktivitas Terkini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {farmers.slice(0, 5).map((farmer, idx) => (
                  <div key={farmer.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-700">
                        {farmer.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{farmer.full_name}</p>
                      <p className="text-sm text-slate-500">{farmer.village}, {farmer.district}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      farmer.verification_status === "verified" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {farmer.verification_status === "verified" ? "Terverifikasi" : "Pending"}
                    </span>
                  </div>
                ))}
                {farmers.length === 0 && (
                  <p className="text-center text-slate-500 py-8">Belum ada data petani</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}