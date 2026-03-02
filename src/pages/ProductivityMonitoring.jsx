import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Map as MapIcon, TreePine, BarChart3, 
  AlertTriangle, CheckCircle, Leaf, Bug, Cloud, Droplets
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { OfflineService } from "@/components/common/offlineStorage";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280"];

const issueIcons = {
  none: CheckCircle,
  pest: Bug,
  disease: Leaf,
  weather: Cloud,
  nutrient_deficiency: Leaf,
  water_shortage: Droplets,
  other: AlertTriangle
};

const issueLabels = {
  none: "Tidak Ada Masalah",
  pest: "Hama",
  disease: "Penyakit",
  weather: "Cuaca",
  nutrient_deficiency: "Kekurangan Nutrisi",
  water_shortage: "Kekurangan Air",
  other: "Lainnya"
};

export default function ProductivityMonitoring() {
  const [filterLevel, setFilterLevel] = useState("regency");
  const [selectedRegion, setSelectedRegion] = useState("all");

  // const { data: lands = [] } = useQuery({
  //   queryKey: ["lands"],
  //   queryFn: () => base44.entities.Land.list()
  // });

  // const { data: plants = [] } = useQuery({
  //   queryKey: ["plants"],
  //   queryFn: () => base44.entities.Plant.list()
  // });

  const {data: rawLands = []} = useQuery({
    queryKey: ['lands'],
    queryFn: async () => {
      let dataServer = [];
      try{
        const res = await base44.entities.Farmer.list();
        dataServer = Array.isArray(res) ? res : [];
        
      }catch(err){}
        const localData = await OfflineService.getEntities('lands');
        const combined = new Map();
        dataServer.forEach(d => combined.set(d.id, d));
        localData.array.forEach(f => combined.set(f.id, f));
        return Array.from(combined.values());
    }
  });

  const {data: rawPlants = []} = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      let data = [];
      try{
        const res = await base44.entities.Plant.list();
        data = Array.isArray(res) ? res :[];
      }catch(e){}
      const local = await OfflineService.getEntities('plants');
      const mapped = new Map();
      data.forEach(d => mapped.set(d.id, d));
      local.forEach(l => mapped.set(l.id, l));

      return Array.from(mapped.values());
    }
  });

  const lands = Array.isArray(rawLands) ? rawLands : [];
  const plants = Array.isArray(rawPlants) ? rawPlants : [];

  // const { data: harvests = [] } = useQuery({
  //   queryKey: ["harvests"],
  //   queryFn: () => base44.entities.Harvest.list()
  // });

  const { data: rawHarvests = [] } = useQuery({
    queryKey: ["harvests"],
    queryFn: async () => {
      try {
        const res = await base44.entities.Harvest.list();
        return Array.isArray(res) ? res : [];
      } catch (e) {
        return [];
      }
    }
  });
  
  const harvests = Array.isArray(rawHarvests) ? rawHarvests : [];

  // Get unique regions
  const regions = {
    regency: [...new Set(lands.map(l => l.regency).filter(Boolean))],
    district: [...new Set(lands.map(l => l.district).filter(Boolean))],
    village: [...new Set(lands.map(l => l.village).filter(Boolean))]
  };

  // Filter data by region
  const filteredLands = selectedRegion === "all" 
    ? lands 
    : lands.filter(l => l[filterLevel] === selectedRegion);
  
  const filteredLandIds = filteredLands.map(l => l.id);
  const filteredPlants = plants.filter(p => filteredLandIds.includes(p.land_id));

  // Calculate productivity stats
  const calculateProductivityStats = () => {
    const totalLands = filteredLands.length;
    if (totalLands === 0) return { avg: 0, distribution: [] };

    const landsWithProductivity = filteredLands.filter(l => l.productivity_percentage !== undefined);
    const avgProductivity = landsWithProductivity.length > 0
      ? landsWithProductivity.reduce((sum, l) => sum + (l.productivity_percentage || 0), 0) / landsWithProductivity.length
      : 0;

    const distribution = [
      { name: "Sangat Produktif (>80%)", value: filteredLands.filter(l => (l.productivity_percentage || 0) > 80).length, color: "#10b981" },
      { name: "Produktif (60-80%)", value: filteredLands.filter(l => (l.productivity_percentage || 0) >= 60 && (l.productivity_percentage || 0) <= 80).length, color: "#22c55e" },
      { name: "Kurang Produktif (40-60%)", value: filteredLands.filter(l => (l.productivity_percentage || 0) >= 40 && (l.productivity_percentage || 0) < 60).length, color: "#f59e0b" },
      { name: "Tidak Produktif (<40%)", value: filteredLands.filter(l => (l.productivity_percentage || 0) < 40).length, color: "#ef4444" }
    ];

    return { avg: avgProductivity, distribution };
  };

  // Calculate plant health stats
  const calculatePlantStats = () => {
    const total = filteredPlants.length;
    if (total === 0) return { statusDist: [], issueDist: [] };

    const statusDist = [
      { name: "Produktif", value: filteredPlants.filter(p => p.productivity_status === "productive" || !p.productivity_status).length },
      { name: "Kurang Produktif", value: filteredPlants.filter(p => p.productivity_status === "less_productive").length },
      { name: "Tidak Produktif", value: filteredPlants.filter(p => p.productivity_status === "not_productive").length }
    ];

    const issueCount = filteredPlants.reduce((acc, p) => {
      const issue = p.issue_type || "none";
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {});

    const issueDist = Object.entries(issueCount)
      .filter(([key]) => key !== "none")
      .map(([key, value]) => ({ name: issueLabels[key], value, type: key }));

    return { statusDist, issueDist };
  };

  // Calculate regional productivity
  const calculateRegionalProductivity = () => {
    const groupKey = filterLevel === "regency" ? "regency" : filterLevel === "district" ? "district" : "village";
    
    const grouped = lands.reduce((acc, land) => {
      const region = land[groupKey] || "Tidak Diketahui";
      if (!acc[region]) {
        acc[region] = { totalLands: 0, totalArea: 0, totalProductivity: 0, landsWithProductivity: 0 };
      }
      acc[region].totalLands++;
      acc[region].totalArea += land.area_hectares || 0;
      if (land.productivity_percentage !== undefined) {
        acc[region].totalProductivity += land.productivity_percentage;
        acc[region].landsWithProductivity++;
      }
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        productivity: data.landsWithProductivity > 0 ? Math.round(data.totalProductivity / data.landsWithProductivity) : 0,
        area: data.totalArea,
        lands: data.totalLands
      }))
      .sort((a, b) => b.productivity - a.productivity);
  };

  const productivityStats = calculateProductivityStats();
  const plantStats = calculatePlantStats();
  const regionalData = calculateRegionalProductivity();

  // Grade distribution from harvests
  const gradeDistribution = harvests.reduce((acc, h) => {
    if (h.grade) {
      acc[h.grade] = (acc[h.grade] || 0) + 1;
    }
    return acc;
  }, {});

  const gradeData = ["A", "B", "C", "D", "rejected"].map(grade => ({
    name: grade === "rejected" ? "Rejected" : `Grade ${grade}`,
    value: gradeDistribution[grade] || 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monitoring Produktivitas</h1>
            <p className="text-slate-500">Pantau produktivitas lahan dan tanaman</p>
          </div>
          <div className="flex gap-3">
            <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setSelectedRegion("all"); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regency">Kabupaten</SelectItem>
                <SelectItem value="district">Kecamatan</SelectItem>
                <SelectItem value="village">Desa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua Wilayah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Wilayah</SelectItem>
                {regions[filterLevel].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Produktivitas</p>
                  <p className="text-2xl font-bold text-slate-900">{productivityStats.avg.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <MapIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Lahan</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredLands.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <TreePine className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Tanaman</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredPlants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Bermasalah</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredPlants.filter(p => p.issue_type && p.issue_type !== "none").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Productivity Chart */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Produktivitas per Wilayah</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="productivity" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Land Productivity Distribution */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Distribusi Produktivitas Lahan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productivityStats.distribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {productivityStats.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Plant Issues & Grade Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plant Issues */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bug className="w-5 h-5 text-amber-500" />
                  Masalah Tanaman
                </CardTitle>
              </CardHeader>
              <CardContent>
                {plantStats.issueDist.length > 0 ? (
                  <div className="space-y-3">
                    {plantStats.issueDist.map(issue => {
                      const Icon = issueIcons[issue.type] || AlertTriangle;
                      const percentage = ((issue.value / filteredPlants.length) * 100).toFixed(1);
                      return (
                        <div key={issue.type} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{issue.name}</span>
                              <span className="text-sm text-slate-500">{issue.value} ({percentage}%)</span>
                            </div>
                            <Progress value={parseFloat(percentage)} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
                    <p>Tidak ada masalah terdeteksi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Grade Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Distribusi Grade Hasil Panen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {harvests.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {gradeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[Math.min(index, COLORS.length - 1)]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p>Belum ada data hasil panen</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Regional Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Detail Produktivitas per Wilayah</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Wilayah</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600">Jumlah Lahan</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600">Luas (Ha)</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600">Produktivitas</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionalData.map(region => (
                      <tr key={region.name} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{region.name}</td>
                        <td className="text-center py-3 px-4">{region.lands}</td>
                        <td className="text-center py-3 px-4">{region.area.toFixed(2)}</td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={region.productivity} className="w-20 h-2" />
                            <span className="text-xs font-medium">{region.productivity}%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge className={
                            region.productivity > 80 ? "bg-emerald-100 text-emerald-700" :
                            region.productivity >= 60 ? "bg-green-100 text-green-700" :
                            region.productivity >= 40 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {region.productivity > 80 ? "Sangat Produktif" :
                             region.productivity >= 60 ? "Produktif" :
                             region.productivity >= 40 ? "Kurang Produktif" :
                             "Tidak Produktif"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}