import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Link, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LandCard from "@/components/lands/LandCard";
import SyncStatus from "@/components/common/SyncStatus";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FarmerForm  from "@/components/farmers/FarmerForm";
import { 
  ArrowLeft, Edit, MapPin, Phone, Users, CreditCard, 
  Map, Plus, CheckCircle, XCircle, Clock
} from "lucide-react";
import LinkUserAccount from "@/components/farmers/LinkUserAccount";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OfflineService } from "@/components/common/offlineStorage";
import { useNavigate } from 'react-router-dom';

export default function FarmerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchId = urlParams.get("id");
  const queryClient = useQueryClient();
  const {id: paramsId } = useParams();
  const id = paramsId || searchId;
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  // const { data: farmer, isLoading } = useQuery({
  //   queryKey: ["farmer", farmerId],
  //   queryFn: () => base44.entities.Farmer.filter({ id: farmerId }).then(res => res[0]),
  //   enabled: !!farmerId
  // });

  const { data: farmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: () => base44.entities.Farmer.list("-created_date"),
    enabled: true
  });

  // const farmer = farmers.find(farmer => farmer.id === farmerId);
  const {data : farmer =[], isLoading }  = useQuery({
    queryKey: ['farmer', id],
    queryFn: async (data) => {
      if(!id) return null;

      try{
        const response = await base44.entities.Farmer.get(id);
        if (typeof response === 'string' && response.includes('<!doctype html>')) {
          console.warn("API returned HTML instead of JSON. Falling back to local.");
        } else if (response && !response.error) {
          return response; // Berhasil ambil JSON
        }
      } catch (e) {
        console.warn("Server unreachable, searching locally...");
      }

      const localData = await OfflineService.getEntities('farmers', {id:id});
      if(localData && localData.length > 0 ){
        return {...localData[0], isOffline:true}
      }
      return null;
    },
    enabled : !!id,
    initialData: null
  });
  console.log('Farmer Detail', farmer)
  // const { data: landsRaw = [] } = useQuery({
  //   queryKey: ["lands", farmerId],
  //   queryFn: () => base44.entities.Land.list(),
  //   // queryFn: () => base44.entities.Land.filter({ farmer_id: farmerId }),
  //   // enabled: !!farmerId
  // });

  const { data: rawLands = [] } = useQuery({
    queryKey: ["lands"],
    queryFn: async () => {
      let serverData = [];
      try {
        const resp = await base44.entities.Land.list("-created_date");
        // Cek apakah response string HTML (error fallback server)
        if (typeof resp === 'string' && resp.includes('<!doctype html>')) {
          console.warn("Server returned HTML for Land list");
        } else if (Array.isArray(resp)) {
          serverData = resp;
        }
      } catch (e) { 
        console.warn("Server lands unreachable"); 
      }

      // Ambil data lokal
      const localData = await OfflineService.getEntities("lands");
      
      const combined = new Map();
      serverData.forEach(l => { if(l.id) combined.set(l.id, l); });
      localData.forEach(l => { if(l.id) combined.set(l.id, l); });

      const result = Array.from(combined.values());
      console.log("🔍 Dexie & Server Merge:", result.length, "items");
      return result;
    }
  });

  const lands = useMemo(() => {
    // Pastikan menggunakan rawLands (sesuai destructuring di atas)
    const safeLands = Array.isArray(rawLands) ? rawLands : [];
    
    // Debugging: Cek apakah ID yang dicari ada di dalam daftar
    console.log("Filtering lands for farmer ID:", id);
    
    return safeLands.filter(land => {
      // Gunakan == untuk jaga-jaga jika ID satu string dan satu number
      return land.farmer_id == id;
    });
  }, [rawLands, id]);
  
  // const { data: plants = [] } = useQuery({
  //   queryKey: ["plants", farmerId],
  //   queryFn: () => base44.entities.Plant.filter({ farmer_id: farmerId }),
  //   enabled: !!farmerId
  // });

  const { data: rawPlants = [] } = useQuery({
    queryKey: ["plants", id],
    queryFn: async () => {
      try {
        // base44.filter sering mengembalikan objek jika error, kita bungkus
        const res = await base44.entities.Plant.filter({ farmer_id: id });
        return Array.isArray(res) ? res : [];
      } catch (e) {
        return await OfflineService.getEntities('plants', { farmer_id: id });
      }
    },
    enabled: !!id
  });
  const plants = Array.isArray(rawPlants) ? rawPlants : [];

  const verifyMutation = useMutation({
    mutationFn: async (status) => {
      console.log("Data dari Verifikais :", [status, id])
      try {
        const onlineUpdate = await base44.entities.Farmer.update(id, { verification_status: status })
        if(typeof onlineUpdate == 'string' && onlineUpdate.includes('<!doctype html>')){
          throw Error("HTML respond found, it must be error")
        }

        return onlineUpdate;
      } catch (error) {
        throw {type: "OFFLINE_SAVE", status, id};
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer", id] });
      toast.success("Status verifikasi diperbarui!");
    },
    onError: async (error, variables) => {
      console.log(variables);
      if(error.type == 'OFFLINE_SAVE'){
        console.warn("Saving offline");
        try {
          const entity = 'farmer';
          await OfflineService.saveEntityLocally(entity,{
            ...variables,
            id: variables.id,
            verification_status: variables.status,
          });
          
          queryClient.setQueryData(["farmers"], (oldData) => {
            if (!Array.isArray(oldData)) return [];

            return oldData.map(item => {
              if (item.id === variables.id) {
                return { 
                  ...item, 
                  verification_status: variables.status, 
                  sync_status: 'pending' 
                };
              }
              return item;
            });
          });
          
          queryClient.setQueryData(["farmer", variables.id], (oldData) => {
            return oldData ? { ...oldData, verification_status: variables.status, sync_status: 'pending' } : oldData;
          });

          // toast.info("Tersimpan secara lokal");
          // setTimeout(() => {
          //   navigate(createPageUrl("Farmers"));
          // }, 500);

        } catch (sqlError) {
          console.error("SQLite Error:", sqlError);
          toast.error("Gagal simpan lokal");
        }
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => base44.entities.Farmer.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer", id] });
      toast.success("Data petani diperbarui!");
      setIsEditing(false);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <EmptyState
          icon={Users}
          title="Petani tidak ditemukan"
          description="Data petani yang Anda cari tidak tersedia"
          action={() => window.location.href = createPageUrl("Farmers")}
          actionLabel="Kembali ke Daftar"
        />
      </div>
    );
  }

  const statusColors = {
    pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: Clock },
    verified: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: CheckCircle },
    rejected: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: XCircle }
  };
  const statusConfig = statusColors[farmer.verification_status] || statusColors.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Farmers")}>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{farmer.full_name}</h1>
              <p className="text-slate-500">NIK: {farmer.nik}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatus status={farmer.sync_status} />
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FarmerForm
              initialData={farmer}
              isLoading={updateMutation.isLoading}
              onSubmit={(data) => updateMutation.mutate(data)}
            />

            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Batal
              </Button>
            </div>
          </motion.div>
        )}
        {!isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-4">
                    {farmer.photo_url ? (
                      <img src={farmer.photo_url} alt={farmer.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-emerald-700">
                        {farmer.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">{farmer.full_name}</h3>
                  <div className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                    <StatusIcon className={`w-4 h-4 ${statusConfig.text}`} />
                    <span className={`text-sm font-medium ${statusConfig.text}`}>
                      {farmer.verification_status === "verified" ? "Terverifikasi" : 
                       farmer.verification_status === "rejected" ? "Ditolak" : "Menunggu Verifikasi"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">NIK</p>
                      <p className="font-medium text-slate-900">{farmer.nik}</p>
                    </div>
                  </div>
                  {farmer.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Telepon</p>
                        <p className="font-medium text-slate-900">{farmer.phone}</p>
                      </div>
                    </div>
                  )}
                  {farmer.farmer_group && (
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Kelompok Tani</p>
                        <p className="font-medium text-slate-900">{farmer.farmer_group}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Alamat</p>
                      <p className="font-medium text-slate-900">
                        {farmer.village}, {farmer.district}<br/>
                        {farmer.regency}, {farmer.province}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Actions */}
                {farmer.verification_status === "pending" && (
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
                    <p className="text-sm text-slate-500 text-center mb-3">Tindakan Verifikasi</p>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => verifyMutation.mutate("verified")}
                        disabled={verifyMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Terima
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => verifyMutation.mutate("rejected")}
                        disabled={verifyMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                )}

                {/* Link User Account */}
                {!farmer.user_email && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <LinkUserAccount farmerId={farmer.id} onLinked={() => queryClient.invalidateQueries({ queryKey: ["farmer", id] })} />
                  </div>
                )}
                {farmer.user_email && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-500 text-center mb-2">Akun Terhubung</p>
                    <p className="text-sm font-medium text-center text-emerald-600">{farmer.user_email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Lands & Plants */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Lands */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Map className="w-5 h-5 text-emerald-600" />
                  Lahan Terdaftar
                </CardTitle>
                <Link to={createPageUrl("LandRegister") + `?farmer_id=${id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Lahan
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {lands.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lands.map(land => (
                      <LandCard 
                        key={land.id} 
                        land={land} 
                        plantCount={plants.filter(p => p.land_id === land.id).length}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Map className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>Belum ada lahan terdaftar</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm p-4">
                <p className="text-sm text-slate-500">Total Lahan</p>
                <p className="text-2xl font-bold text-slate-900">{lands.length}</p>
              </Card>
              <Card className="border-0 shadow-sm p-4">
                <p className="text-sm text-slate-500">Total Luas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {lands.reduce((sum, l) => sum + (l.area_hectares || 0), 0).toFixed(2)} Ha
                </p>
              </Card>
              <Card className="border-0 shadow-sm p-4">
                <p className="text-sm text-slate-500">Total Tanaman</p>
                <p className="text-2xl font-bold text-slate-900">{plants.length}</p>
              </Card>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
}