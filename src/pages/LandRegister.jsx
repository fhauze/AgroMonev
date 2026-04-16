import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
import { createPageUrl } from "@/utils";
import GPSLandMapper from "@/components/lands/GPSLandMapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Map, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { OfflineService } from "@/components/common/offlineStorage";

export default function LandRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedFarmerId = urlParams.get("farmer_id");

  // const [formData, setFormData] = useState({
  //   farmer_id: preselectedFarmerId || "",
  //   name: "",
  //   land_status: "owned",
  //   village: "",
  //   district: "",
  //   regency: "",
  //   polygon_coordinates: null,
  //   center_lat: null,
  //   center_lng: null,
  //   area_hectares: null,
  //   validation_status: "pending",
  //   sync_status: "pending"
  // });


  const [formData, setFormData] = useState({
    nama : '',
    status_kepemilikan : 'Pribadi',
    profile_id : '1',
    desa_kelurahan_id :'1',
    district: "",
    regency: "",
    path : '',
    luas_lahan : '',
    created_by : '',
    updated_by : '',
    deleted_by : '',
  });

  // const { data: farmers = [] } = useQuery({
  //   queryKey: ["farmers"],
  //   queryFn: () => base44.entities.Farmer.list()
  // });

  const { data: rawFarmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: async () => {
      try {
        const response = await entity("map","petani").list();
        // Pastikan response adalah array
        const serverData = Array.isArray(response) ? response : [];
        
        // Gabungkan dengan data lokal dari Dexie
        const localData = await OfflineService.getEntities("farmers");
        
        const combined = new Map();
        serverData.forEach(f => combined.set(f.id, f));
        localData.forEach(f => combined.set(f.id, f));
        
        return Array.from(combined.values());
      } catch (err) {
        console.warn("Gagal ambil petani dari server, mencoba ambil lokal...");
        return await OfflineService.getEntities("farmers");
      }
    }
  });
  const farmers = Array.isArray(rawFarmers) ? rawFarmers : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try{
        console.log("register land")
        const response = await entity("map", "lahan").create(data);
        if (typeof response === 'string' && response.includes('<!doctype html>')) {
            throw new Error("Menerima HTML, bukan JSON. Endpoint mungkin salah.");
        }
        console.log("2. Berhasil simpan ke server", response);
        return response;
      }catch(error){
        console.log("2. Gagal ke server, beralih ke offline mode", error);
        throw { type: 'OFFLINE_SAVE', data };
      }
    },
    // mutationFn: (data) => createLand(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lands"] });
      toast.success("Lahan berhasil didaftarkan!");
      navigate(createPageUrl("LandDetail") + `?id=${data.id}`);
    },
    onError: async (error, variables) => {
      if(error.type === 'OFFLINE_SAVE'){
        try{
          const entity = 'land';
          const localId = await OfflineService.saveEntityLocally(entity,variables);
          queryClient.invalidateQueries({ queryKey: ["lands"] });
          

          toast.info("Tersimpan secara lokal");
          setTimeout(() => {
            navigate(createPageUrl("Lands"));
          }, 500);
          navigate(createPageUrl("Lands"))
        }catch(sqlError){
          console.error("SQLite Error:", sqlError);
          toast.error("Gagal simpan lokal");
        }
      }
    },

  });

  // const createMutation = useMutation({
  //   mutationFn: (data) => createLand(data),
    
  //   onSuccess: async (data) => {
  //   // Debugging: Cek apakah data benar-benar sudah masuk ke DB sebelum pindah halaman
  //     const checkData = await getAllLand();
  //     console.log("🔍 Cek data di DB setelah insert:", checkData);

  //     // Refresh query agar list di UI terupdate
  //     queryClient.invalidateQueries({ queryKey: ["farmer-lands"] });
      
  //     toast.success("Lahan berhasil didaftarkan!");
      
  //     // Navigasi ke detail
  //     navigate(createPageUrl("LandDetail") + `?id=${data.id}`);
  //   },
  //   onError: (error) => {
  //     console.error("Mutation Error:", error);
  //     toast.error("Gagal mendaftarkan lahan");
  //   }
  // });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // const handlePolygonSave = (polygonData) => {
  //   // setFormData(prev => ({
  //   //   ...prev,
  //   //   ...polygonData
  //   // }));
  //   setFormData(prev => ({
  //     ...prev,
  //     polygon_coordinates: polygonData.polygon_coordinates,
  //     center_lat: polygonData.center_lat,
  //     center_lng: polygonData.center_lng,
  //     area_hectares: polygonData.area_hectares
  //   }));
  //   toast.success(`Polygon disimpan! Luas: ${polygonData.area_hectares.toFixed(4)} Ha`);
  // };

  const handlePolygonSave = (polygonData) => {
    const cleanCoordinates = JSON.parse(JSON.stringify(polygonData.polygon_coordinates));
    console.log(cleanCoordinates)
    setFormData(prev => ({
      ...prev,
      // polygon_coordinates: cleanCoordinates,
      path : JSON.stringify(cleanCoordinates),
      center_lat: Number(polygonData.center_lat),
      center_lng: Number(polygonData.center_lng),
      area_hectares: Number(polygonData.area_hectares),
      luas_lahan: polygonData.area_hectares
    }));

    toast.success(`Polygon disimpan! Luas: ${polygonData.area_hectares.toFixed(4)} Ha`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.farmer_id) {
      toast.error("Pilih petani terlebih dahulu");
      return;
    }

    if (!formData.center_lat || !formData.center_lng) {
      toast.error("Gambar polygon lahan di peta");
      return;
    }
    console.log("🚀 SUBMIT formData:", formData);
    createMutation.mutate(formData);
  };

  // Auto-fill address from farmer
  // const selectedFarmer = farmers.find(f => f.id === formData.farmer_id);
  const selectedFarmer = Array.isArray(farmers) 
  ? farmers.find(f => f.id === formData.farmer_id) 
  : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link to={createPageUrl("Lands")}>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Registrasi Lahan Baru</h1>
            <p className="text-slate-500">Gambar polygon dan isi data lahan</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Map className="w-5 h-5 text-emerald-600" />
                  Informasi Lahan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama/Label Lahan</Label>
                    <Input
                      value={formData.nama}
                      onChange={(e) => handleChange("nama", e.target.value)}
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
                      value={formData.desa_kelurahan_id}
                      onChange={(e) => handleChange("desa_kelurahan_id", e.target.value)}
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
              disabled={createMutation.isPending || !formData.farmer_id}
              className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Daftarkan Lahan
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}