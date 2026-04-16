import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
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
  User, Map as MapIcon, TreePine, Plus, LogOut, CheckCircle, Clock, Truck,
  Edit, Loader2, MapPin, Phone, Users as UsersIcon, ClipboardCheck, AlertTriangle, Bug, Send, Package,
  Save, CreditCard, FileText
} from "lucide-react";
import PlantInspectionForm from "@/components/plants/PlantInspectionForm";
import DistributionForm from "@/components/distribution/DistributionForm";
import HarvestForm  from "@/components/harvest/HarvestForm";
import { toast } from "sonner";
import { motion, sync } from "framer-motion";
import { OfflineService } from "@/components/common/offlineStorage";
import axios from 'axios';


export default function FarmerPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [farmer, setFarmer] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLand, setShowAddLand] = useState(false);
  const [showTagPlant, setShowTagPlant] = useState(false);
  const [selectedLand, setSelectedLand] = useState(null);
  const [inspectingPlant, setInspectingPlant] = useState(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  // Offline entity hooks
  const harvestEntity = useOfflineEntity("Harvest");
  const isInitialMount = useRef(true);
  const safeArray = (v) => Array.isArray(v) ? v : [];
  //profile
  const [isEditing, setIsEditing] = useState(false);
  const [selectedKtp, setSelectedKtp] = useState(null);
  const [ktpPreview, setKtpPreview] = useState(null);
  const [locationData, setLocationData ] = useState({
    provinces: [],
    regencies: [],
    districts: [],
    villages: []
  });

  useEffect(() => {
    const prepareDataLocation = async() => {
      if(!navigator.onLine){
        try{
        const [villages, districts, regencies, provinces] = await Promise.all([
          OfflineService.getEntities('villages'),
          OfflineService.getEntities('districts'),
          OfflineService.getEntities('regencies'),
          OfflineService.getEntities('provinces'),
        ]);

        setLocationData({
          villages: villages, districts:districts, regencies:regencies,provinces:provinces});
        }catch(err){
          console.error(err)
        }
      }else{
        try{
        const [villages, districts, regencies, provinces] = await Promise.all([
          OfflineService.getEntities('villages'),
          OfflineService.getEntities('districts'),
          OfflineService.getEntities('regencies'),
          OfflineService.getEntities('provinces'),
        ]);

        setLocationData({villages: villages, districts:districts, regencies:regencies,provinces:provinces});
        console.log("Offline")
        }catch(err){
          console.error(err)
        }
      }
    };

    prepareDataLocation();
  }, []);

  const [farmerFormData, setFarmerFormData] = useState({
    nama: farmer?.nama || farmer?.name || "",
    telepon: farmer?.telepon || farmer?.phone || "",
    alamat: farmer?.alamat || "",
    kk: farmer?.kk || "",
    ktp: farmer?.ktp || "",
    email:'', 
    desa_kelurahan_id:  farmer?.kelurahan_desa_id || 0,
  });
  const [newLandData, setNewLandData] = useState(
    { 
      nama: "", 
      land_status: "owned", 
      status_kepemilikan: 'sewa',
      desa_kelurahan_id: 1,
      luas_lahan:0,
      village: "", 
      district: "", 
      regency: "" 
    }
  );

  const [farmerProf, setFarmerProf] = useState({
    nama:'',
    keluarga_id:1,
    alamat: '',
    email:'', 
    desa_kelurahan_id:1, 
    telepon: '', 
    kktp: '',
    file_kk: '', 
    file_ktp: '', 
    path_kk: '', 
    path_ktp: '',
    role:'',
    user_id:1,
    ktp:'',
  });

  const { data: villages = [] } = useQuery({
    queryKey: ['desa_kelurahan'],
    queryFn: async () => {
      try {
        const response = await entity('master', 'desa-kelurahan').list();
        
        return Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
      } catch (error) {
        console.error("Gagal mengambil data desa:", error);
        return [];
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    cacheTime: 48 * 60 * 60 * 1000,
  });

  const { data: distributions = [] } = useQuery({
    queryKey: ["farmer-distributions", farmer?.id],
    queryFn: async() => {
      try{
        const resp = await entity('distribusi','panen').list();
        let data = resp.data || [];
        data = data.filter((dt) => dt.farmer_id === farmer.id)

        return data;
      }catch(err){
        console.error("Local Data")
        const localDist = await OfflineService.getEntities('distributions') || [];
        const filteredDist = localDist && localDist.length > 0 ? localDist.filter((dis) => {
          if(dis.farmer_id === farmer.id){
            return dis;
          }
        }) : [];
        return filteredDist;
      }
    },
    enabled: !!farmer?.id
  });

  const {data: harvests = []} = useQuery({
    queryKey: ["harvest", farmer?.id],
    queryFn: async() => {
      try{
        const response = await entity('map','panen').list();
        const data = response.data ?? [];
        if(data && data.length > 0){
          return data;
        }
        return []
      }catch(err){
        console.warn("loda local data");
        const localHarv = await OfflineService.getEntities('harvests') || [];
        const filteredHarv = localHarv && localHarv.length > 0 ? 
              localHarv.filter((data) => {
                if(data.farmer_id === farmer.id){
                  return data;
                }
              }) : [];
        return filteredHarv;
      }
      
    },
    enabled: !!farmer?.id
  });

  const { data: lands = [] } = useQuery({
    queryKey: ["lands", farmer?.id],
    queryFn: async () => {
      let lahans = [];
      try{
        const listLahan = await entity('map', 'lahan').list();
        lahans = Array.isArray(listLahan.data) 
        ? listLahan.data.filter(l => l.profile_id === profile.id) 
        : [];
        
      }catch(err){
        console.warn("Online data is un reachable")
      }
      try{
        console.log(profile?.id || 0, "PRofile id")
        const offlineData = await OfflineService.getEntities('lands');
        const offlineLahan = safeArray(offlineData).filter(lh => lh.profile_id === profile.id);
        const combined = new Map();

        safeArray(offlineLahan).forEach(el => combined.set(el.id, el));
        safeArray(lahans).forEach(l => combined.set(l.id, l));
        
        return Array.from(combined.values()).sort((a, b) => 
          new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at)
        );
      }catch(err){
        console.error(err)
      }

    },
    enabled: !!farmer?.id
  });

  const { data: plants = [] } = useQuery({
    queryKey: ["farmer-plants", farmer?.id],
    queryFn: async () => {
      try {
        const [response, inspctResponse] = await Promise.all([
          entity('map', 'tanaman').list(),
          entity('map', 'inspeksi').list()
        ]);

        const $rawPlants = response.data.data ?? [];
        const $rawInspection = inspctResponse.data.data ?? [];

        const inspectionMap = new Map();
        $rawInspection.forEach((insp) => {
          const tId = insp.tanaman_id?.toString();
          if (tId) {
            if (!inspectionMap.has(tId)) {
              inspectionMap.set(tId, []);
            }
            inspectionMap.get(tId).push(insp);
          }
        });

        const mergedPlants = $rawPlants.map((plant) => {
          const inspections = inspectionMap.get(plant.id.toString()) || [];
          
          return {
            ...plant,
            inspections: inspections,
            latest_inspection: inspections.length > 0 ? inspections[inspections.length - 1] : null
          };
        });

        return mergedPlants;
      } catch (error) {
        console.error("Gagal mengambil data gabungan:", error);
        return [];
      }
    },
    enabled: !!farmer?.id
  });

  const createLandMutation = useMutation({
    mutationFn: async (data) => {
      if (!navigator.onLine) {
        throw new Error("OFFLINE_MODE");
      }
      
      return await entity('map', 'lahan').create({
        ...data,
        farmer_id: farmer.id,
        validation_status: "pending",
        sync_status: "pending"
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-lands"] });
      setShowAddLand(false);
      setNewLandData({ 
        nama: "", 
        land_status: "owned", 
        status_kepemilikan: 'sewa',
        desa_kelurahan_id: 1,
        luas_lahan:0,
        village: "", 
        district: "", 
        regency: "" 
      });
      toast.success("Lahan berhasil ditambahkan!");
    },
    onError: async (error, variables) => {
      console.log("Terjadi kesalahan, menyimpan ke lokal...", error.message);
      try {
        await OfflineService.saveEntityLocally('lands', {
          ...variables,
          farmer_id: farmer.id,
          validation_status: "pending",
        });
        
        // Invalidate agar UI mengambil data dari local DB (IndexedDB)
        queryClient.invalidateQueries({ queryKey: ["farmer-lands"] });
        // resetForm();
        toast.info("Data disimpan secara lokal (Offline)");
      } catch (localErr) {
        toast.error("Gagal menyimpan data lokal: " + localErr.message);
      }
    }
  });

  const createPlantMutation = useMutation({
    mutationFn: (data) => {
      const payloads = {
        ...data,
        komoditas_id: 1,
        lahan_id:data.land_id,
        nama: data.commodity_name
      }
      console.log('Data tag tanaman :',payloads)
      return entity('map', 'tanaman').create(payloads)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-plants"] });
      toast.success("Tanaman berhasil ditag!");
    }
  }); 

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

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      console.log(profile)
      const token = localStorage.getItem("access_token");
      try{
        const response = await axios.post(
          `https://agro.pkc-dev.org/api/auth/profile/1`, 
          data,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        return response;
      }catch(err){
        console.log(err)
        return err;
      }
      // return await entity('auth','profile').update(profile?.id, data);
    },
    onSuccess: () => {
      console.log("Berhasil mengubah data profile")
    }
  });

  const handleSaveLand = (polygonData) => {
    if (!newLandData.nama) {
      toast.error("Masukkan nama lahan terlebih dahulu");
      return;
    }

    // save data
    const polygonToSave = JSON.stringify(polygonData.polygon_coordinates)
    const luas_lahan = polygonData.area_hectares
    createLandMutation.mutate({
      ...newLandData,
      ...polygonData,
      luas_lahan: luas_lahan,
      path: polygonToSave
    });
  };

  const handleLogin = () => {
    window.location.href = createPageUrl('Login')
  };

  useEffect(() => {
    if (!isInitialMount.current) return;
    const loadData = async () => { 
      setIsLoading(true);
      try {
        let currentUser;
        let currentProfile;

        try{
          const [rMe, rFar] = await Promise.all([
            entity('auth', 'me').list(),
            entity('auth', 'profile/1').list()
          ]);

          const dataMeRaw = rMe.data || [];
          const dataMe = {
            ...dataMeRaw,
            'verification_status':'verified',
          }
          const dataProfile = rFar.data || [];

          currentUser = {
            profile_id: dataProfile?.id,
            ...dataMe,
            ...dataProfile
          }

          currentProfile = dataProfile;
          
          if(dataProfile){
            setProfile(currentProfile);
          }

          if (!currentUser || (typeof currentUser === 'string' && currentUser.includes('<!doctype html>'))) {
            throw { type: 'OFFLINE_DATA' };
          }

          localStorage.setItem('user_data', JSON.stringify(currentUser));
        }catch(err){
          console.error("Error : ", err)
          const localUser = localStorage.getItem('user_data'); 
          const userBase = JSON.parse(localUser);
          const localProfilesRaw = await OfflineService.getEntities('farmers') || [];
          
          const localProfile = localProfilesRaw && localProfilesRaw.length > 0 ? localProfilesRaw.find(prof => {
              return Number(prof.id) === Number(userBase.id)
            }
          ) : null;

          currentUser = localUser ? JSON.parse(localUser) : null
          currentProfile = localProfile
          console.log(" Local Profile => ",localProfile, " Curr Profile => " ,currentProfile, " Curr User=> ",currentUser, "local profile")
        }

        if (currentUser) {
          setUser(currentUser);
          setFarmer(currentUser);
          setProfile(currentUser);
          
          setFarmerProf((prev) => ({
            ...prev,
            nama: currentUser.profile?.nama || currentUser.nama || currentUser.name || 'Tanpa Nama',
            email: currentUser.email || '',
            user_id: currentUser.id || 0
          }));
          
          setFarmerFormData({
            nama: currentUser.profile?.nama || currentUser.nama || currentUser.name || "",
            telepon: currentUser.profile?.telepon || currentUser.telepon || currentUser.phone || "",
            alamat: currentUser.profile?.alamat || currentUser.alamat || "",
            kk: currentUser.profile?.kk || currentUser.kk || "",
            ktp: currentUser.profile?.ktp || currentUser.ktp || "",
            desa_kelurahan_id: currentUser.profile?.desa_kelurahan_id || currentUser.kelurahan_desa_id || 0,
            email: profile?.email || currentProfile.email || ''
          });
        }
        
      } catch (error) {
        console.error("Data error: ", error)
      } finally {
        setIsLoading(false);
        isInitialMount.current = false;
      }
    };
    loadData();
  }, [farmer, profile]);

  useEffect(() => {
    return () => {
      if (ktpPreview) URL.revokeObjectURL(ktpPreview);
    };
  }, [ktpPreview]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  useEffect(() => {
    const autoFillLocation = async () => {
      if(!newLandData.desa_kelurahan_id) return;
      const selectedVillage = locationData.villages.find(data => newLandData.desa_kelurahan_id === data.id);
      if(!selectedVillage) return;

      if (selectedVillage) {
        const selectedDistrict = selectedVillage.kecamatan;
        const selectedRegency = selectedDistrict?.kabupatenKota;
        const selectedProvince = selectedRegency?.provinsi;
        setLocationData((prev) => ({
          ...prev,
          districts: selectedDistrict ? [selectedDistrict] : [],
          regencies: selectedRegency ? [selectedRegency] : [],
          provinces: selectedProvince ? [selectedProvince] : [],
        }));
      }
    };

    autoFillLocation();
  }, [newLandData.desa_kelurahan_id, locationData.villages]);

  // profile control
  const handleToggleEdit = async () => {
    const formDataBaru = new FormData();
    if (isEditing) {
      formDataBaru.append('_method', 'PUT');
      formDataBaru.append('nama', farmerFormData.nama);
      formDataBaru.append('telepon', farmerFormData.telepon);
      formDataBaru.append('alamat', farmerFormData.alamat);
      formDataBaru.append('kk', farmerFormData.kk);
      formDataBaru.append('file_ktp', selectedKtp);
      formDataBaru.append('ktp', farmerFormData.ktp);
      formDataBaru.append('email', farmerFormData.email);
      formDataBaru.append('desa_kelurahan_id', '1');
      
      try {
        updateProfileMutation.mutate(formDataBaru);
        toast.success("Profil berhasil diperbarui");
        setIsEditing(false);
      } catch (error) {
        console.error("Gagal Update Data : ", error)
        toast.error("Gagal menyimpan perubahan");
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    // Reset form ke data asli dari prop 'farmer'
    setFarmerFormData({
      nama: profile?.nama || "",
      telepon: profile?.telepon || "",
      alamat: profile?.alamat || "",
      kk: profile?.kk || "",
      ktp: profile?.ktp || profile.ktp || "",
      desa_kelurahan_id: profile?.desa_kelurahan_id || 0,
      email: profile?.email || '',

    });
    
    // Bersihkan preview foto jika ada
    setSelectedKtp(null);
    if (ktpPreview) {
      URL.revokeObjectURL(ktpPreview);
      setKtpPreview(null);
    }

    setIsEditing(false);
    toast.info("Perubahan dibatalkan");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFarmerFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const fileKtp = e.target.files ? e.target.files[0] : null;
    
    if(fileKtp){
      if(fileKtp.size > 3 * 1024 * 1024){
        toast.error("Ukuran file terlalu besar. Maksimal 3MB.");
        return;
      }
      setSelectedKtp(fileKtp);
      setKtpPreview(URL.createObjectURL(fileKtp));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  
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
  const alivePlants = plants.length;
  const totalArea = lands.reduce((sum, l) => sum + parseFloat(l.area_hectares || l.luas_lahan || 0), 0);
  
  if (user.role !== 'petani') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Petani</h1>
              <p className="text-slate-500 mb-8">
                Masuk untuk melihat data panen sampai distribusi
              </p>
              <Button onClick={handleLogin} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-lg">
                Masuk
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }
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
            <MapPin className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
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
                <MapPin className="w-4 h-4 mr-2" />
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
                        plantCount={plants.filter(p => p.lahan_id === land.id).length}
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
                  icon={MapIcon}
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
                    const land = lands.find(l => l.id === plant.lahan_id);
                    const hasIssue = plant.inspections?.[0]?.issue_type && plant.inspections?.[0]?.issue_type !== "none";
                    return (
                      <Card key={plant.id} className="border-0 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              plant.inspections?.[0]?.productivity_status === "productive" ? "bg-emerald-500" :
                              plant.inspections?.[0]?.productivity_status === "less_productive" ? "bg-amber-500" :
                              plant.inspections?.[0]?.productivity_status === "not_productive" ? "bg-red-500" :
                              plant.status === "sick" ? "bg-red-500" : 
                              plant.status === "dead" ? "bg-slate-400" : "bg-emerald-500"
                            }`} />
                            <div>
                              <p className="font-medium text-slate-900">{plant.nama}</p>
                              <p className="text-sm text-slate-500">{land?.nama || "Lahan tidak diketahui"}</p>
                              {hasIssue && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Bug className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs text-amber-600">
                                    {plant.inspections?.[0]?.issue_type === "pest" ? "Hama (" + plant.inspections?.[0]?.issue_description + ")":
                                     plant.inspections?.[0]?.issue_type === "disease" ? "Penyakit" :
                                     plant.inspections?.[0]?.issue_type === "weather" ? "Cuaca" :
                                     plant.inspections?.[0]?.issue_type === "nutrient_deficiency" ? "Nutrisi" :
                                     plant.inspections?.[0]?.issue_type === "water_shortage" ? "Air" : "Masalah"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${
                              plant.inspections?.[0]?.productivity_status === "not_productive" ? "border-red-200 text-red-600" :
                              plant.inspections?.[0]?.productivity_status === "less_productive" ? "border-amber-200 text-amber-600" :
                              "border-emerald-200 text-emerald-600"
                            }`}>
                              {plant.inspections?.[0]?.productivity_status === "productive" ? "Produktif" : 
                               plant.inspections?.[0]?.productivity_status === "less_productive" ? "Kurang Produktif" :
                               plant.inspections?.[0]?.productivity_status === "not_productive" ? "Tidak Produktif": "Produktif"}
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
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div>
                    <CardTitle className="text-lg font-bold">Informasi Profil</CardTitle>
                    <p className="text-xs text-slate-500">Informasi Lengkap Petani</p>
                  </div>
                  <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      {/* Tombol Cancel */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCancel}
                        disabled={updateProfileMutation.isPending}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Batal
                      </Button>
                      
                      {/* Tombol Simpan */}
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleToggleEdit}
                        disabled={updateProfileMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Save className="w-4 h-4 mr-2" /> Simpan</>
                        )}
                      </Button>
                    </>
                  ) : (
                    /* Tombol Edit (Saat tidak sedang mengedit) */
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" /> Edit Profil
                    </Button>
                  )}
                </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  {/* Field Nama */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <User className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Nama Lengkap</p>
                      {isEditing ? (
                        <Input 
                          name="nama"
                          value={farmerFormData.nama} 
                          onChange={handleInputChange}
                          className="mt-1 h-8 px-2"
                        />
                      ) : (
                        <p className="font-medium text-slate-900">{farmerFormData.nama}</p>
                      )}
                    </div>
                  </div>

                  {/* Field Alamat */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Alamat</p>
                      {isEditing ? (
                        <Input 
                          name="alamat"
                          value={farmerFormData.alamat} 
                          onChange={handleInputChange}
                          className="mt-1 h-8 px-2"
                        />
                      ) : (
                        <p className="font-medium text-slate-900">{farmerFormData.alamat}</p>
                      )}
                    </div>
                  </div>

                  {/* Field Telepon */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Telepon</p>
                      {isEditing ? (
                        <Input 
                          name="telepon"
                          value={farmerFormData.telepon} 
                          onChange={handleInputChange}
                          className="mt-1 h-8 px-2"
                        />
                      ) : (
                        <p className="font-medium text-slate-900">{farmerFormData.telepon || "-"}</p>
                      )}
                    </div>
                  </div>

                  {/* Field KTP & KK (Hanya muncul jika diperlukan/diedit) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Nomor KTP</p>
                        {isEditing ? (
                          <Input 
                            name="ktp"
                            value={farmerFormData.ktp} 
                            onChange={handleInputChange}
                            className="mt-1 h-8 px-2"
                          />
                        ) : (
                          <p className="font-medium text-slate-900">{farmerFormData.ktp || "-"}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Nomor KK</p>
                        {isEditing ? (
                          <Input 
                            name="kk"
                            value={farmerFormData.kk} 
                            onChange={handleInputChange}
                            className="mt-1 h-8 px-2"
                          />
                        ) : (
                          <p className="font-medium text-slate-900">{farmerFormData.kk || "-"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {isEditing ? (
                      <div className="space-y-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <Label className="text-xs text-emerald-700 font-bold">Upload Foto KTP</Label>
                        
                        {/* Box Preview saat Editing */}
                        {(ktpPreview || farmer.path_ktp) && (
                          <div className="relative w-full h-40 bg-slate-200 rounded-md overflow-hidden border-2 border-dashed border-emerald-200">
                            <img 
                              src={ktpPreview || farmer.path_ktp} 
                              alt="Preview KTP" 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded shadow-md">
                              {ktpPreview ? "Foto Baru" : "Foto Lama"}
                            </div>
                          </div>
                        )}

                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="bg-white"
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          *Format: JPG, PNG. Maksimal 2MB.
                        </p>
                      </div>
                    ) : (
                      /* Tampilan View Mode (Hanya muncul jika sudah ada foto) */
                      farmer.path_ktp && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 mb-2">Lampiran KTP</p>
                          <img 
                            src={profile.path_ktp} 
                            alt="KTP" 
                            className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(profile.ktp, '_blank')}
                          />
                        </div>
                      )
                    )}
                  </div>

                  {/* Kelompok Tani (Biasanya Read Only) */}
                  {farmer.farmer_group && (
                    <div className="flex items-center gap-3 p-3 bg-slate-100/50 rounded-lg opacity-80">
                      <UsersIcon className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Kelompok Tani (Read Only)</p>
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
                  onChange={(e) => setNewLandData(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Kebun Kopi Utara"
                />
              </div>
              <div className="space-y-2">
                <Label>Status Kepemilikan</Label>
                <Select value={newLandData.land_status} onValueChange={(v) => setNewLandData(prev => ({ ...prev, land_status: v, status_kepemilikan: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Milik Sendiri</SelectItem>
                    <SelectItem value="sewa">Sewa</SelectItem>
                    <SelectItem value="shared">Bagi Hasil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kelurahan / Desa</Label>
                <Select 
                  value={newLandData.desa_kelurahan_id?.toString()} 
                  onValueChange={(v) => 
                  setNewLandData(prev => ({ ...prev, desa_kelurahan_id: parseInt(v)}))
                }>
                  <SelectTrigger> <SelectValue /> </SelectTrigger>
                  <SelectContent>
                    { villages && villages.length > 0 ? (
                      villages.map((village) => (
                        <SelectItem 
                            key={village.id} 
                            value={village.id.toString()}
                            >{village.nama}</SelectItem>
                      ))
                    ) : (
                      <div className="">Memuat Data</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 gap-4">
                <Label>Kecamatan</Label>
                <Input
                  value={locationData.districts[0]?.nama || "-"}
                  readOnly
                  placeholder="Nama kecamatan"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kabupaten</Label>
                <Input
                  value={locationData.regencies[0]?.nama}
                  readOnly
                  placeholder="Nama kabupaten"
                />
              </div>
              <div className="space-y-2">
                <Label>Provinsi</Label>
                <Input
                  value={locationData.provinces[0]?.nama}
                  readOnly
                  placeholder="Nama desa"
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
            <DialogTitle>Tag Tanaman - {selectedLand?.nama}</DialogTitle>
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
              farmer_id={farmer?.id}
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