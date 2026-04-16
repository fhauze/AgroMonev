import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Link } from "react-router-dom";
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
  User, Map, TreePine, Plus, LogOut, CheckCircle, Clock, 
  Edit, Loader2, MapPin, Phone, Users as UsersIcon
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function FarmerPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [farmer, setFarmer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLand, setShowAddLand] = useState(false);
  const [showTagPlant, setShowTagPlant] = useState(false);
  const [selectedLand, setSelectedLand] = useState(null);
  const [newLandData, setNewLandData] = useState({ name: "", land_status: "owned", village: "", district: "", regency: "" });

  // Load user and farmer data
  useEffect(() => {
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

  // Load farmer's lands
  const { data: lands = [] } = useQuery({
    queryKey: ["farmer-lands", farmer?.id],
    queryFn: () => base44.entities.Land.filter({ farmer_id: farmer.id }),
    enabled: !!farmer?.id
  });

  // Load farmer's plants
  const { data: plants = [] } = useQuery({
    queryKey: ["farmer-plants", farmer?.id],
    queryFn: () => base44.entities.Plant.filter({ farmer_id: farmer.id }),
    enabled: !!farmer?.id
  });

  // Create land mutation
  const createLandMutation = useMutation({
    mutationFn: (data) => base44.entities.Land.create({
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
    }
  });

  // Create plant mutation
  const createPlantMutation = useMutation({
    mutationFn: (data) => base44.entities.Plant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-plants"] });
      toast.success("Tanaman berhasil ditag!");
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
            <TabsList className="w-full bg-white shadow-sm p-1 h-auto">
              <TabsTrigger value="lands" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <Map className="w-4 h-4 mr-2" />
                Lahan Saya
              </TabsTrigger>
              <TabsTrigger value="plants" className="flex-1 py-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <TreePine className="w-4 h-4 mr-2" />
                Tanaman
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
                    return (
                      <Card key={plant.id} className="border-0 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              plant.status === "alive" ? "bg-emerald-500" :
                              plant.status === "sick" ? "bg-amber-500" : "bg-slate-400"
                            }`} />
                            <div>
                              <p className="font-medium text-slate-900">{plant.commodity_name}</p>
                              <p className="text-sm text-slate-500">{land?.name || "Lahan tidak diketahui"}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {plant.status === "alive" ? "Hidup" : 
                             plant.status === "sick" ? "Sakit" : 
                             plant.status === "dead" ? "Mati" : "Dipanen"}
                          </Badge>
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
    </div>
  );
}