import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { useOfflineEntity } from "@/components/common/useOfflineEntity";
import SyncStatusBar from "@/components/common/SyncStatusBar";
import { createPageUrl } from "@/utils";
import LandCard from "@/components/lands/LandCard";
import GPSLandMapper from "@/components/lands/GPSLandMapper";
import GPSPlantTagger from "@/components/plants/GPSPlantTagger";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Map, TreePine, Plus, LogOut, CheckCircle, Clock, Truck,
  Edit, Loader2, MapPin, Phone, Users as UsersIcon, ClipboardCheck, AlertTriangle, Bug, Send, Package
} from "lucide-react";
import PlantInspectionForm from "@/components/plants/PlantInspectionForm";
import DistributionForm from "@/components/distribution/DistributionForm";
import HarvestForm  from "@/components/harvest/HarvestForm";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { initDB } from "@/utils/sqlClient";
import { createLand, getAllLand } from "../repository/landRepository";


export default function FarmerPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [farmer, setFarmer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLand, setShowAddLand] = useState(false);
  const [showTagPlant, setShowTagPlant] = useState(false);
  const [selectedLand, setSelectedLand] = useState(null);
  const [newLandData, setNewLandData] = useState({ name: "", land_status: "owned", village: "", district: "", regency: "" });
  const [inspectingPlant, setInspectingPlant] = useState(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [selectedPlantForHarvest, setSelectedPlantForHarvest] = useState(null);

  // Load farmer's distributions
  const { data: distributions = [] } = useQuery({
    queryKey: ["farmer-distributions", farmer?.id],
    queryFn: () => base44.entities.Distribution.filter({ farmer_id: farmer?.id }),
    enabled: !!farmer?.id
  });

  const {data: harvests = []} = useQuery({
    queryKey: ["farmer-harvests", farmer?.id],
    queryFn: () => base44.entities.Harvest.filter({ farmer_id: farmer?.id }),
    enabled: !!farmer?.id
  });

  // Offline entity hooks
  const landEntity = useOfflineEntity("Land");
  const plantEntity = useOfflineEntity("Plant");
  const harvestEntity = useOfflineEntity("Harvest");

  // Load user and farmer data
  useEffect(() => {
    getAllLand().then(console.log);
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Find farmer linked to this user
        const farmers = await base44.entities.Farmer.filter({ user_email: currentUser.email });
        if (farmers.length > 0) {
          setFarmer(farmers[0]);
        }
      } catch (error) {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  async function getEntities(entityType) {
    const db = await initDB();
    const rows = [];
  
    db.exec({
      sql: `SELECT * FROM ${entityType}`,
      rowMode: "object",
      resultRows: rows
    });
  
    return rows.map(r => JSON.parse(r.payload));
  }

  // Load farmer's lands with offline support
  const { data: lands = [] } = useQuery({
    queryKey: ["farmer-lands", farmer?.id],
    queryFn: () => landEntity.filter({ farmer_id: farmer.id }),
    // queryFn: async () => {
    //   console.log("📡 Mengambil data lahan untuk ID:", farmer.id);
      
    //   // Harus pakai AWAIT karena getAllLand adalah fungsi async (mengambil dari DB)
    //   const data = await getAllLand(farmer.id);
      
    //   console.log("📥 Data berhasil dimuat ke React Query:", data);
    //   return data; 
    // },
    enabled: !!farmer?.id
  });
  console.log("lands", lands);
  // Load farmer's plants with offline support
  const { data: plants = [] } = useQuery({
    queryKey: ["farmer-plants", farmer?.id],
    queryFn: () => plantEntity.filter({ farmer_id: farmer.id }),
    enabled: !!farmer?.id
  });

  // Create land mutation with offline support
  const createLandMutation = useMutation({
    mutationFn: (data) => createLand({
      ...data,
      farmer_id: farmer.id,
      validation_status: "pending",
      sync_status: "pending"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-lands"] });
      setShowAddLand(false);
      setNewLandData({ name: "", land_status: "owned", village: "", district: "", regency: "" });
      toast.success("Lahan berhasil ditambahkan!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Create plant mutation with offline support
  const createPlantMutation = useMutation({
    mutationFn: (data) => plantEntity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-plants"] });
      toast.success("Tanaman berhasil ditag!");
    }
  });

  // mutation harvest
  const createHarvestMutation = useMutation({
    mutationFn: (data) => harvestEntity.create({
      ...data,
      farmer_id: farmer.id,
      sync_status: "pending",
      created_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-harvests"] });
      setShowHarvestForm(false);
      setSelectedPlantForHarvest(null);
      toast.success("Data panen berhasil disimpan!");
    }
  });

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleSaveLand = (polygonData) => {
    if (!newLandData.name) {
      toast.error("Masukkan nama lahan terlebih dahulu");
      return;
    }
    createLandMutation.mutate({
      ...newLandData,
      ...polygonData
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
                <TreePine className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Petani</h1>
              <p className="text-slate-500 mb-8">
                Masuk untuk mengelola lahan dan tanaman Anda
              </p>
              <Button onClick={handleLogin} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-lg">
                Masuk / Daftar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Logged in but no farmer profile linked
  if (!farmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Akun Belum Terdaftar</h1>
              <p className="text-slate-500 mb-4">
                Email <span className="font-medium">{user.email}</span> belum terhubung dengan data petani.
              </p>
              <p className="text-sm text-slate-400 mb-8">
                Hubungi admin untuk mendaftarkan akun Anda sebagai petani.
              </p>
              <Button variant="outline" onClick={handleLogout} className="w-full h-12">
                <LogOut className="w-5 h-5 mr-2" />
                Keluar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Main portal view
  const alivePlants = plants.filter(p => p.status === "alive").length;
  const totalArea = lands.reduce((sum, l) => sum + (l.area_hectares || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Sync Status Bar */}
        <SyncStatusBar />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              {farmer.photo_url ? (
                <img src={farmer.photo_url} alt={farmer.full_name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">{farmer.full_name?.charAt(0)?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{farmer.full_name}</h1>
              <div className="flex items-center gap-2">
                {farmer.verification_status === "verified" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Terverifikasi
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Menunggu Verifikasi
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="border-0 shadow-sm p-4 text-center">
            <Map className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{lands.length}</p>
            <p className="text-xs text-slate-500">Lahan</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <TreePine className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{alivePlants}</p>
            <p className="text-xs text-slate-500">Tanaman</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <MapPin className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{totalArea.toFixed(1)}</p>
            <p className="text-xs text-slate-500">Hektar</p>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="lands" className="space-y-4">
            <TabsList className="w-full bg-white shadow-sm p-1 h-auto flex-wrap">
              <TabsTrigger value="lands" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <Map className="w-4 h-4 mr-2" />
                Lahan
              </TabsTrigger>
              <TabsTrigger value="plants" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <TreePine className="w-4 h-4 mr-2" />
                Tanaman
              </TabsTrigger>
              <TabsTrigger value="harvest" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <Package className="w-4 h-4 mr-2" />
                Panen
              </TabsTrigger>
              <TabsTrigger value="distribution" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <Truck className="w-4 h-4 mr-2" />
                Distribusi
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <User className="w-4 h-4 mr-2" />
                Profil
              </TabsTrigger>
            </TabsList>

            {/* Lands Tab */}
            <TabsContent value="lands" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Daftar Lahan</h2>
                <Button size="sm" onClick={() => setShowAddLand(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Lahan
                </Button>
              </div>

              {lands.length > 0 ? (
                <div className="grid gap-4">
                  {lands.map(land => (
                    <div key={land.id} className="relative">
                      <LandCard 
                        land={land} 
                        plantCount={plants.filter(p => p.land_id === land.id).length}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-4 right-4"
                        onClick={() => {
                          setSelectedLand(land);
                          setShowTagPlant(true);
                        }}
                      >
                        <TreePine className="w-4 h-4 mr-1" />
                        Tag Tanaman
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Map}
                  title="Belum ada lahan"
                  description="Tambahkan lahan pertama Anda dengan menggunakan GPS"
                  action={() => setShowAddLand(true)}
                  actionLabel="Tambah Lahan"
                />
              )}
            </TabsContent>

            {/* Plants Tab */}
            <TabsContent value="plants" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Daftar Tanaman ({plants.length})</h2>
              
              {plants.length > 0 ? (
                <div className="grid gap-3">
                  {plants.map(plant => {
                    const land = lands.find(l => l.id === plant.land_id);
                    const hasIssue = plant.issue_type && plant.issue_type !== "none";
                    return (
                      <Card key={plant.id} className="border-0 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              plant.status === "alive" && plant.productivity_status === "productive" ? "bg-emerald-500" :
                              plant.status === "alive" && plant.productivity_status === "less_productive" ? "bg-amber-500" :
                              plant.status === "sick" ? "bg-red-500" : 
                              plant.status === "dead" ? "bg-slate-400" : "bg-emerald-500"
                            }`} />
                            <div>
                              <p className="font-medium text-slate-900">{plant.commodity_name}</p>
                              <p className="text-sm text-slate-500">{land?.name || "Lahan tidak diketahui"}</p>
                              {hasIssue && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Bug className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs text-amber-600">
                                    {plant.issue_type === "pest" ? "Hama" :
                                     plant.issue_type === "disease" ? "Penyakit" :
                                     plant.issue_type === "weather" ? "Cuaca" :
                                     plant.issue_type === "nutrient_deficiency" ? "Nutrisi" :
                                     plant.issue_type === "water_shortage" ? "Air" : "Masalah"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${
                              plant.productivity_status === "not_productive" ? "border-red-200 text-red-600" :
                              plant.productivity_status === "less_productive" ? "border-amber-200 text-amber-600" :
                              "border-emerald-200 text-emerald-600"
                            }`}>
                              {plant.productivity_status === "productive" || !plant.productivity_status ? "Produktif" : 
                               plant.productivity_status === "less_productive" ? "Kurang Produktif" : "Tidak Produktif"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => setInspectingPlant(plant)}
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={TreePine}
                  title="Belum ada tanaman"
                  description="Tag tanaman Anda melalui menu lahan"
                />
              )}
            </TabsContent>

            {/* Harvest Tab */}
            <TabsContent value="harvest" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Catatan Panen</h2>
                <Button size="sm" onClick={() => setShowHarvestForm(true)} className="bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Catat Panen
                </Button>
              </div>

              {harvests.length > 0 ? (
                <div className="grid gap-3">
                  {harvests.map(harvest => (
                    <Card key={harvest.id} className="border-0 shadow-sm p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900">{harvest.commodity_name || "Komoditas"}</p>
                          <p className="text-sm text-slate-500">
                            {new Date(harvest.harvest_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">{harvest.weight_kg} Kg</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {lands.find(l => l.id === harvest.land_id)?.name || "Lahan Umum"}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="Belum ada catatan panen"
                  description="Mulai catat hasil panen Anda untuk melacak produktivitas"
                  action={() => setShowHarvestForm(true)}
                  actionLabel="Catat Panen Sekarang"
                />
              )}
            </TabsContent>

            {/* Distribution Tab */}
            <TabsContent value="distribution" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Distribusi ke Offtaker</h2>
                <Button size="sm" onClick={() => setShowDistribution(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Baru
                </Button>
              </div>

              {distributions.length > 0 ? (
                <div className="grid gap-3">
                  {distributions.map(dist => {
                    const statusConfig = {
                      pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
                      in_transit: { label: "Dalam Pengiriman", color: "bg-blue-100 text-blue-700" },
                      received: { label: "Diterima", color: "bg-indigo-100 text-indigo-700" },
                      graded: { label: "Sudah Grade", color: "bg-emerald-100 text-emerald-700" },
                      completed: { label: "Selesai", color: "bg-emerald-100 text-emerald-700" },
                      rejected: { label: "Ditolak", color: "bg-red-100 text-red-700" }
                    };
                    const isDowngraded = dist.offtaker_grade && dist.offtaker_grade !== dist.farmer_grade;
                    
                    return (
                      <Card key={dist.id} className="border-0 shadow-sm p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{dist.commodity_name}</p>
                            <p className="text-sm text-slate-500">Ke: {dist.offtaker_name}</p>
                          </div>
                          <Badge className={statusConfig[dist.status]?.color || "bg-slate-100"}>
                            {statusConfig[dist.status]?.label || dist.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-slate-500">Jumlah</p>
                            <p className="font-medium">{dist.quantity_kg} Kg</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Grade Klaim</p>
                            <p className="font-medium">{dist.farmer_grade}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Grade Final</p>
                            <p className={`font-medium ${isDowngraded ? "text-amber-600" : "text-emerald-600"}`}>
                              {dist.offtaker_grade || "-"}
                              {isDowngraded && " ↓"}
                            </p>
                          </div>
                        </div>
                        {dist.grade_difference_reason && (
                          <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-700">
                            <strong>Alasan:</strong> {dist.grade_difference_reason}
                          </div>
                        )}
                        {dist.total_value && (
                          <p className="mt-2 text-sm font-semibold text-emerald-600">
                            Total: Rp {dist.total_value.toLocaleString()}
                          </p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="Belum ada distribusi"
                  description="Kirim hasil panen ke offtaker untuk mendapatkan grading"
                  action={() => setShowDistribution(true)}
                  actionLabel="Kirim Distribusi"
                />
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Nama Lengkap</p>
                      <p className="font-medium text-slate-900">{farmer.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Alamat</p>
                      <p className="font-medium text-slate-900">
                        {farmer.village}, {farmer.district}, {farmer.regency}
                      </p>
                    </div>
                  </div>
                  {farmer.phone && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Telepon</p>
                        <p className="font-medium text-slate-900">{farmer.phone}</p>
                      </div>
                    </div>
                  )}
                  {farmer.farmer_group && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <UsersIcon className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Kelompok Tani</p>
                        <p className="font-medium text-slate-900">{farmer.farmer_group}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Add Land Dialog */}
      <Dialog open={showAddLand} onOpenChange={setShowAddLand}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Lahan Baru</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lahan *</Label>
                <Input
                  value={newLandData.name}
                  onChange={(e) => setNewLandData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Kebun Kopi Utara"
                />
              </div>
              <div className="space-y-2">
                <Label>Status Kepemilikan</Label>
                <Select value={newLandData.land_status} onValueChange={(v) => setNewLandData(prev => ({ ...prev, land_status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Milik Sendiri</SelectItem>
                    <SelectItem value="rented">Sewa</SelectItem>
                    <SelectItem value="shared">Bagi Hasil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Desa</Label>
                <Input
                  value={newLandData.village}
                  onChange={(e) => setNewLandData(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="Nama desa"
                />
              </div>
              <div className="space-y-2">
                <Label>Kecamatan</Label>
                <Input
                  value={newLandData.district}
                  onChange={(e) => setNewLandData(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Nama kecamatan"
                />
              </div>
              <div className="space-y-2">
                <Label>Kabupaten</Label>
                <Input
                  value={newLandData.regency}
                  onChange={(e) => setNewLandData(prev => ({ ...prev, regency: e.target.value }))}
                  placeholder="Nama kabupaten"
                />
              </div>
            </div>

            <GPSLandMapper onSave={handleSaveLand} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Plant Dialog */}
      <Dialog open={showTagPlant} onOpenChange={setShowTagPlant}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tag Tanaman - {selectedLand?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedLand && (
            <GPSPlantTagger
              landId={selectedLand.id}
              farmerId={farmer.id}
              landPolygon={selectedLand.polygon_coordinates}
              existingPlants={plants.filter(p => p.land_id === selectedLand.id)}
              onTagPlant={createPlantMutation.mutate}
              isLoading={createPlantMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={!!inspectingPlant} onOpenChange={() => setInspectingPlant(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
          {inspectingPlant && (
            <PlantInspectionForm
              plant={inspectingPlant}
              onClose={() => setInspectingPlant(null)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["farmer-plants"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Distribution Dialog */}
      <Dialog open={showDistribution} onOpenChange={setShowDistribution}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
          <DistributionForm
            farmer={farmer}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["farmer-distributions"] });
            }}
            onClose={() => setShowDistribution(false)}
            harvests={harvests}
          />
        </DialogContent>
      </Dialog>
      {/** Dialog Harvest */}
      <Dialog open={showHarvestForm} onOpenChange={setShowHarvestForm}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Input Hasil Panen</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <HarvestForm 
              lands={lands}
              plants={plants}
              onSubmit={(data) => createHarvestMutation.mutate(data)}
              onCancel={() => setShowHarvestForm(false)}
              isLoading={createHarvestMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}