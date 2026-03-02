import { useState,useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Link, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LandMap from "@/components/lands/LandMap";
import GPSPlantTagger from "@/components/plants/GPSPlantTagger";
import SyncStatus from "@/components/common/SyncStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GPSLandMapper from "@/components/lands/GPSLandMapper";
import { 
  ArrowLeft, Edit, MapPin, User, Maximize2, TreePine, Loader2,
  Plus, CheckCircle, AlertTriangle, Clock, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OfflineService } from "@/components/common/offlineStorage";

const validationColors = {
  valid: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: CheckCircle },
  invalid: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: XCircle },
  need_review: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: AlertTriangle },
  pending: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", icon: Clock }
};

const validationLabels = {
  valid: "Tervalidasi",
  invalid: "Tidak Valid",
  need_review: "Perlu Review",
  pending: "Menunggu Validasi"
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

export default function LandDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchId = urlParams.get("id");
  const queryClient = useQueryClient();
  const [showPlantTagger, setShowPlantTagger] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // another way
  const {id: paramsId } = useParams();

  const id = paramsId || searchId;

  /* Edit Function */
  const [formData, setFormData] = useState(null);
  const handleChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePolygonSave = (polygonData) => {
    setFormData(prev => ({
      ...prev,
      ...polygonData
    }));
    toast.success(`Polygon disimpan! Luas: ${polygonData.area_hectares.toFixed(4)} Ha`);
  };
  const updateMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Land.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lands"] });
      queryClient.invalidateQueries({ queryKey: ["land", id] });

      toast.success("Lahan berhasil diperbarui!");
      setIsEditing(false);
    },

    onError: (err) => {
      console.error("Update land error:", err);
      toast.error("Gagal memperbarui lahan");
    }
  });

  // const { data: lands = [], isLoading } = useQuery({
  //   queryKey: ["lands"],
  //   queryFn: () => base44.entities.Land.list(),
  // });

  const { data: land = [], isLoading , isError} = useQuery({
    queryKey: ["land", id],
    queryFn: async () => {
      // 1. Ambil data server
      let serverData = [];
      try {
        const serverData = await base44.entities.Land.get(id);
        if(typeof serverData == 'string' && serverData.includes('<!doctype html>')){
          console.warn('data server tidak ditemukan');
        }
        else if (serverData && !serverData.error) return serverData;
      } catch (e) {
        console.warn("Server unreachable, searching locally...");
      }

      const localData = await OfflineService.getEntities("lands", { id: id });
      if (localData && localData.length > 0) {
        return { ...localData[0], isOffline: true };
      }
      throw new Error("Lahan tidak ditemukan");
    },
    enabled: !!id,
    initialData: null
  });

  console.log('Land data =>', land)
  // const { data: farmers = [] } = useQuery({
  //   queryKey: ["farmers"],
  //   queryFn: () => base44.entities.Farmer.list()
  // });

  const { data: farmer } = useQuery({
    queryKey: ["farmer", land?.farmer_id],
    queryFn: async () => {
      if (!land?.farmer_id) return null;
      try {
        return await base44.entities.Farmer.get(land.farmer_id);
      } catch (e) {
        const localFarmer = await OfflineService.getEntities("farmers", { id: land.farmer_id });
        return localFarmer[0] || null;
      }
    },
    enabled: !!land?.farmer_id
  });
  
  // const { data: farmer } = useQuery({
  //   queryKey: ["farmer", land?.farmer_id],
  //   queryFn: () => base44.entities.Farmer.filter({ id: land.farmer_id }).then(res => res[0]),
  //   enabled: !!land?.farmer_id
  // });

  // const { data: plants = [] } = useQuery({
  //   queryKey: ["plants", landId],
  //   queryFn: () => base44.entities.Plant.filter({ land_id: landId }),
  //   enabled: !!landId
  // });

  // const { data: plantsRaw = [] } = useQuery({
  //   queryKey: ["plants"],
  //   queryFn: () => base44.entities.Plant.list(), // atau ambil semua
  // });

  // const { data: rawPlants = [] } = useQuery({
  //   queryKey: ["plants", id],
  //   queryFn: async () => {
  //     try {
  //       // Filter tanaman berdasarkan land_id
  //       const resp = await base44.entities.Plant.list({ q: JSON.stringify({ land_id: id }) });
  //       return Array.isArray(resp) ? resp : [];
  //     } catch (e) {
  //       return await OfflineService.getEntities("plants", { land_id: id });
  //     }
  //   }
  // });

  const { data: plants = [] } = useQuery({
    queryKey: ["plants", id],
    queryFn: async () => {
      try {
        const response = await base44.entities.Plant.list({ q: JSON.stringify({ land_id: id }) });
        // VALIDASI: Paksa harus array
        return Array.isArray(response) ? response : [];
      } catch (e) {
        const local = await OfflineService.getEntities("plants", { land_id: id });
        return Array.isArray(local) ? local : [];
      }
    }
  }); 

  const { data: inspections = [] } = useQuery({
    queryKey: ["inspections", id],
    queryFn: async () => {
      try {
        const response = await base44.entities.PlantInspection.list();
        return Array.isArray(response) ? response : [];
      } catch (e) {
        // Ambil dari Dexie jika ada
        const local = await OfflineService.getEntities("plant_inspections");
        return Array.isArray(local) ? local : [];
      }
    }
  });

  // const plants = plantsRaw.filter(p => p.land_id === landId);
  // const plants = Array.isArray(rawPlants) ? rawPlants : [];
  const activePlants = plants.filter(p => p?.status !== 'harvested');

  // const {data : inspections = []} = useQuery({
  //   queryKey: ["inspections"],
  //   queryFn: () => base44.entities.PlantInspection.list(),
  // });

  
  // untuk plant inspection
  const combinePlants = useMemo(() => {
    const latestPlantInspection = new Map();
    
    inspections.forEach((ins) => {
      // Pastikan key konsisten: farmer_land_plant
      const key = `${ins.farmer_id}_${ins.land_id}_${ins.plant_id}`;
      
      if (!latestPlantInspection.has(key) || 
          new Date(ins.created_date) > new Date(latestPlantInspection.get(key).created_date)) {
        latestPlantInspection.set(key, ins);
      }
    });

    // 2. Gunakan .map() bukan .forEach() agar menghasilkan array baru
    return plants.map((plant) => {
      const key = `${plant.farmer_id}_${plant.land_id}_${plant.id}`;
      const inspection = latestPlantInspection.get(key);
      
      // Logika penentuan status produktivitas
      // Jika ada inspeksi, ambil dari sana. Jika tidak, ambil dari status asli tanaman.
      const currentStatus = inspection?.productivity_status || plant.productivity_status || 'alive';

      return {
        ...plant,
        display_status: currentStatus.toLowerCase(), // Normalisasi ke lowercase
        last_inspection_date: inspection?.inspection_date || plant.plant_date,
        has_issue: inspection?.health_status === "mild_issue" || 
                  inspection?.health_status === "unhealthy" || 
                  inspection?.health_status === "sick"
      };
    });
  }, [plants, inspections]);

  /**
   * end Update Operation
   */

  // const { data: land, isLoading } = useQuery({
  //   queryKey: ["land", landId],
  //   queryFn: () => base44.entities.Land.filter({ id: landId }).then(res => res[0]),
  //   enabled: !!landId
  // });

  const validateMutation = useMutation({
    mutationFn: (status) => base44.entities.Land.update(id, { validation_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["land", id] });
      toast.success("Status validasi diperbarui!");
    }
  });

  const createPlantMutation = useMutation({
    mutationFn: (data) => base44.entities.Plant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants", id] });
      setShowPlantForm(false);
      toast.success("Tanaman berhasil ditambahkan!");
    }
  });

  // const alivePlants = plants.filter(p => p.status === "alive").length;
  // const sickPlants = plants.filter(p => p.status === "sick").length;
  // const deadPlants = plants.filter(p => p.status === "dead").length;
  console.log(combinePlants);
  const plantStats = useMemo(() => {
    if (!combinePlants) return { alive: 0, sick: 0, dead: 0 };

    return combinePlants.reduce((acc, plant) => {
      if (plant.display_status === "alive" || plant.display_status === "productive") {
        acc.alive++;
      } else if (plant.display_status === "sick" || plant.display_status === "less_productive" || plant.has_issue) {
        acc.sick++;
      } else if (plant.display_status === "dead" || plant.display_status === "unproductive") {
        acc.dead++;
      }
      return acc;
    }, { alive: 0, sick: 0, dead: 0 });
  }, [combinePlants]);

  useEffect(() => {
    if (land && isEditing) {
      setFormData({
        id: land.id,
        farmer_id: land.farmer_id,
        name: land.name,
        land_status: land.land_status,
        village: land.village,
        district: land.district,
        regency: land.regency,
        polygon_coordinates: land.polygon_coordinates,
        center_lat: land.center_lat,
        center_lng: land.center_lng,
        area_hectares: land.area_hectares,
        validation_status: land.validation_status,
        sync_status: land.sync_status,
      });
    }
  }, [land, isEditing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!land) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto text-center py-16">
          <p className="text-slate-500">Lahan tidak ditemukan</p>
          <Link to={createPageUrl("Lands")}>
            <Button variant="outline" className="mt-4">Kembali ke Daftar</Button>
          </Link>
        </div>
      </div>
    );
  }
  const statusConfig = validationColors[land.validation_status] || validationColors.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Lands")}>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{land.name}</h1>
              <p className="text-slate-500">{land.village}, {land.district}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatus status={land.sync_status} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </motion.div>

        { isEditing && formData && (
          <form onSubmit={
            (e) => {
              e.preventDefault();
              if (!formData.center_lat || !formData.center_lng) {
                toast.error("Polygon lahan belum digambar");
                return;
              }

              updateMutation.mutate({
                ...formData,
                id: id, // opsional, backend pakai param
              });
            }} className="space-y-6">
          {/* Farmer Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  Pemilik Lahan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Pilih Petani</Label>
                  <Select value={formData.farmer_id} onValueChange={(v) => handleChange("farmer_id", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Cari dan pilih petani..." />
                    </SelectTrigger>
                    <SelectContent>
                      {farmers.map(farmer => (
                        <SelectItem key={farmer.id} value={farmer.id}>
                          {farmer.full_name} - {farmer.village}, {farmer.district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Land Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Informasi Lahan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama/Label Lahan</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Contoh: Kebun Kopi Utara"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status Kepemilikan</Label>
                    <Select value={formData.land_status} onValueChange={(v) => handleChange("land_status", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owned">Milik Sendiri</SelectItem>
                        <SelectItem value="rented">Sewa</SelectItem>
                        <SelectItem value="shared">Bagi Hasil</SelectItem>
                        <SelectItem value="government">Tanah Negara</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Desa</Label>
                    <Input
                      value={formData.village}
                      onChange={(e) => handleChange("village", e.target.value)}
                      placeholder="Nama desa"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kecamatan</Label>
                    <Input
                      value={formData.district}
                      onChange={(e) => handleChange("district", e.target.value)}
                      placeholder="Nama kecamatan"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kabupaten</Label>
                    <Input
                      value={formData.regency}
                      onChange={(e) => handleChange("regency", e.target.value)}
                      placeholder="Nama kabupaten"
                      className="h-11"
                    />
                  </div>
                </div>

                {formData.area_hectares && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm text-emerald-600">Luas Lahan Terhitung</p>
                    <p className="text-2xl font-bold text-emerald-700">{formData.area_hectares.toFixed(4)} Hektar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* GPS Land Mapper */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GPSLandMapper onSave={handlePolygonSave} />
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex justify-end"
          >
            <Button 
              type="submit" 
              disabled={updateMutation.isPending || !formData.farmer_id}
              className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Daftarkan Lahan
            </Button>
          </motion.div>
        </form>
        )}
        {!isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Land Info */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}>
                  <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                  <span className={`font-medium ${statusConfig.text}`}>
                    {validationLabels[land.validation_status]}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Maximize2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Luas Lahan</p>
                      <p className="font-semibold text-slate-900">
                        {land.area_hectares ? `${land.area_hectares.toFixed(2)} Hektar` : "-"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Lokasi</p>
                      <p className="font-medium text-slate-900">
                        {land.village}, {land.district}<br/>
                        {land.regency}
                      </p>
                    </div>
                  </div>

                  {farmer && (
                    <Link to={createPageUrl("FarmerDetail") + `?id=${farmer.id}`}>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Pemilik</p>
                          <p className="font-medium text-slate-900">{farmer.full_name}</p>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>

                {/* Validation Actions */}
                {(land.validation_status === "pending" || land.validation_status === "need_review") && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-sm text-slate-500 text-center">Tindakan Validasi</p>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                        onClick={() => validateMutation.mutate("valid")}
                        disabled={validateMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Valid
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        size="sm"
                        onClick={() => validateMutation.mutate("invalid")}
                        disabled={validateMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Invalid
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plants Summary */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-emerald-600" />
                  Tanaman
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowPlantTagger(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tag via GPS
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">{plantStats.alive}</p>
                    <p className="text-xs text-emerald-600">Hidup</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{plantStats.sick}</p>
                    <p className="text-xs text-amber-600">Sakit</p>
                  </div>
                  <div className="text-center p-3 bg-slate-100 rounded-lg">
                    <p className="text-2xl font-bold text-slate-500">{plantStats.dead}</p>
                    <p className="text-xs text-slate-500">Mati</p>
                  </div>
                </div>

                {combinePlants.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {combinePlants.map(plant => (
                      <div key={plant.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            plant.productivity_status === "productive" || plant.display_status === "alive" ? "bg-emerald-500" :
                            plant.display_status === "less_productive" ? "bg-amber-500" : "bg-rose-500"
                          }`} />
                          <span className="text-sm font-medium">{plant.commodity_name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{plant.plant_date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 text-sm py-4">Belum ada tanaman</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {showPlantTagger ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Tag Tanaman dengan GPS</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowPlantTagger(false)}>
                    Tutup
                  </Button>
                </div>
                <GPSPlantTagger
                  landId={id}
                  farmerId={land.farmer_id}
                  landPolygon={land.polygon_coordinates}
                  existingPlants={plants}
                  onTagPlant={createPlantMutation.mutate}
                  isLoading={createPlantMutation.isPending}
                />
              </div>
            ) : (
              <LandMap
                center={[land.center_lat || -6.2, land.center_lng || 106.8]}
                zoom={16}
                lands={[land]}
                plants={plants}
                readOnly={true}
              />
            )}
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
}