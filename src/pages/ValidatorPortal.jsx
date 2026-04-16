import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import base44 from "@/api/Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LandMap from "@/components/lands/LandMap";
import EmptyState from "@/components/common/EmptyState";
import { 
  Shield, Map, CheckCircle, XCircle, Clock, LogOut, 
  User, MapPin, Loader2, FileCheck, AlertTriangle, Users
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { entity } from "@/api/entities";

const roleLabels = {
  kepala_desa: "Kepala Desa",
  kepala_dusun: "Kepala Dusun",
  rt: "Ketua RT",
  rw: "Ketua RW",
  fasilitator: "Fasilitator"
};

const statusStyles = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Menunggu Validasi" },
  valid: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Valid" },
  invalid: { bg: "bg-red-100", text: "text-red-700", label: "Tidak Valid" },
  need_review: { bg: "bg-blue-100", text: "text-blue-700", label: "Perlu Review" }
};

export default function ValidatorPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [validator, setValidator] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for Land Validation
  const [selectedLand, setSelectedLand] = useState(null);
  
  // States for Farmer Validation
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  
  const [validationNotes, setValidationNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const allowedRoles = ['validator', 'super_admin', 'fasilitator'];
      try {
        const currentUser = await entity('auth', 'me').list();
        const CurrentUserRole = currentUser.data.role;
        
        if(allowedRoles.includes(CurrentUserRole)){
          const dataUser = currentUser.data;
          setUser(dataUser);
          setValidator(dataUser)
          setIsLoading(false)
          
        } else{
          console.log("Not Admin and not Validator")
          setUser(null)
          setValidator(null)
        }

      } catch (error) {
        console.error("Gagal hubungkan ke server => " , error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- QUERIES ---

  const { data: lands = [] } = useQuery({
    queryKey: ["validator-lands"],
    queryFn: async() => {
      const response = await entity('map', 'lahan').list();
      return Array.isArray(response.data) ? response.data : [];
    },
    // enabled: !!validator?.village
  });

  const { data: farmers = [] } = useQuery({
    queryKey: ["validator-farmers"],
    queryFn: async () => {
      const farmerRaw = await entity('auth', 'profile').list();
      const farmersData = Array.isArray(farmerRaw?.data) ? farmerRaw?.data : Array.isArray(farmerRaw?.data?.data) ? farmerRaw?.data?.data : [];
      const farmers = farmersData.filter((farmer) => farmer.user.role === 'petani');
      return farmers;
    },
    // enabled: !!validator?.village
  });

  const { data: validations = [] } = useQuery({
    queryKey: ["validations", validator?.id],
    queryFn: () => base44.entities.LandValidation.filter({ validator_email: validator.user_email }),
    enabled: !!validator
  });

  // --- MUTATIONS ---

  // Land Validation Mutation
  const validateLandMutation = useMutation({
    mutationFn: async ({ landId, status }) => {
      const validationStatus = status === "approved" ? "valid" : "invalid";
      await base44.entities.Land.update(landId, { 
        validation_status: validationStatus,
        validation_notes: validationNotes
      });
      await base44.entities.LandValidation.create({
        land_id: landId,
        validator_role: validator.role,
        validator_name: validator.full_name,
        validator_email: validator.user_email,
        status: status,
        notes: validationNotes,
        validated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validator-lands"] });
      queryClient.invalidateQueries({ queryKey: ["validations"] });
      setSelectedLand(null);
      setValidationNotes("");
      toast.success("Validasi lahan disimpan!");
    }
  });

  // Farmer Validation Mutation
  const validateFarmerMutation = useMutation({
    mutationFn: async ({ farmerId, status }) => {
      const validationStatus = status === "approved" ? "valid" : "invalid";
      await base44.put(`auth/profile/${farmerId}/verify`,{ 
        // status: validationStatus,
        // notes: validationNotes,
        // validated_by: validator.full_name,
        // validated_at: new Date().toISOString(),
        email_verified_at : new Date().toISOString(),
      });

      // await base44.put('',{
      //   email_verified_at : new Date().toISOString(),
      // })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validator-farmers"] });
      setSelectedFarmer(null);
      setValidationNotes("");
      toast.success("Validasi petani berhasil!");
    }
  });

  // --- HELPERS ---

  const handleLogout = () => base44.auth.logout();
  const handleLogin = () => base44.auth.redirectToLogin(window.location.href);

  const pendingLands = lands.filter(l => l.validation_status === "pending" || l.validation_status === "need_review");
  
  const pendingFarmers = farmers.filter(f => f.user.email_verified_at === "pending" || !f.user.email_verified_at);
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!user) return <div className="flex justify-center p-20"><Button onClick={handleLogin}>Login Member</Button></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-xl font-bold">{validator.full_name}</h1>
                    <p className="text-sm text-slate-500">{roleLabels[validator.role]} - {validator.village}</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-5 h-5"/></Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col items-center">
                <Map className="text-blue-500 mb-1" />
                <span className="text-xl font-bold">{pendingLands.length}</span>
                <span className="text-xs text-slate-500 text-center">Lahan Tertunda</span>
            </Card>
            <Card className="p-4 flex flex-col items-center">
                <Users className="text-orange-500 mb-1" />
                <span className="text-xl font-bold">{pendingFarmers.length}</span>
                <span className="text-xs text-slate-500 text-center">Petani Tertunda</span>
            </Card>
            <Card className="p-4 flex flex-col items-center">
                <CheckCircle className="text-emerald-500 mb-1" />
                <span className="text-xl font-bold">{validations.length}</span>
                <span className="text-xs text-slate-500 text-center">Total Validasi</span>
            </Card>
            <Card className="p-4 flex flex-col items-center">
                <Clock className="text-slate-500 mb-1" />
                <span className="text-sm font-medium">Aktif</span>
                <span className="text-xs text-slate-500 text-center">Sesi Kerja</span>
            </Card>
        </div>

        <Tabs defaultValue="lands" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lands">Validasi Lahan</TabsTrigger>
            <TabsTrigger value="farmers">Validasi Petani</TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          </TabsList>

          {/* TAB: VALIDASI LAHAN */}
          <TabsContent value="lands" className="mt-4 space-y-4">
            {pendingLands.length > 0 ? (
              pendingLands.map(land => (
                <Card key={land.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{land.name}</h3>
                      <p className="text-sm text-slate-500">{land.area_hectares} Ha • {land.village}</p>
                    </div>
                    <Button onClick={() => setSelectedLand(land)}>Periksa Lahan</Button>
                  </CardContent>
                </Card>
              ))
            ) : <EmptyState icon={Map} title="Lahan Bersih" description="Semua lahan di wilayah anda telah divalidasi." />}
          </TabsContent>

          {/* TAB: VALIDASI PETANI */}
          <TabsContent value="farmers" className="mt-4 space-y-4">
            {pendingFarmers.length > 0 ? (
              pendingFarmers.map(farmer => (
                <Card key={farmer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="text-slate-400" />
                        </div>
                        <div>
                            <h3 className="font-bold">{farmer.full_name || farmer.nama || ''}</h3>
                            <p className="text-sm text-slate-500">NIK: {farmer.nik || farmer.ktp || 'N/A'}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedFarmer(farmer)}>Verifikasi Profil</Button>
                  </CardContent>
                </Card>
              ))
            ) : <EmptyState icon={Users} title="Petani Terverifikasi" description="Tidak ada profil petani baru yang perlu divalidasi." />}
          </TabsContent>

          {/* TAB: RIWAYAT */}
          <TabsContent value="history" className="mt-4 space-y-3">
              {validations.map(v => (
                  <Card key={v.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex justify-between">
                          <span className="font-medium">Validasi Lahan ID: {v.land_id}</span>
                          <Badge variant={v.status === 'approved' ? 'success' : 'destructive'}>{v.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(v.validated_at), "PPP", { locale: id })}</p>
                  </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: VALIDASI LAHAN */}
      <Dialog open={!!selectedLand} onOpenChange={() => setSelectedLand(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detail Lahan: {selectedLand?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="h-64 bg-slate-100 rounded-lg overflow-hidden">
                {selectedLand && <LandMap center={[selectedLand.center_lat, selectedLand.center_lng]} zoom={16} lands={[selectedLand]} readOnly />}
            </div>
            <Textarea placeholder="Tambahkan catatan hasil tinjauan lapangan..." value={validationNotes} onChange={(e) => setValidationNotes(e.target.value)} />
            <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={() => validateLandMutation.mutate({landId: selectedLand.id, status: 'rejected'})}>Tolak</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => validateLandMutation.mutate({landId: selectedLand.id, status: 'approved'})}>Setujui Lahan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: VALIDASI PETANI */}
      <Dialog open={!!selectedFarmer} onOpenChange={() => setSelectedFarmer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verifikasi Identitas Petani</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <p className="font-bold">{selectedFarmer?.full_name || selectedFarmer?.nama }</p>
                </div>
                <div className="space-y-1">
                    <span className="text-slate-500">NIK</span>
                    <p className="font-bold">{selectedFarmer?.nik || selectedFarmer?.ktp || '-'}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-slate-500">No. Telepon</span>
                    <p className="font-bold">{selectedFarmer?.phone || selectedFarmer?.telepon || '-'}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-slate-500">Alamat</span>
                    <p className="font-bold">{selectedFarmer?.address || selectedFarmer?.alamat || '-'}</p>
                </div>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex gap-3 text-xs text-amber-800">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>Pastikan data NIK dan Nama sesuai dengan KTP asli petani yang bersangkutan sebelum memberikan persetujuan.</p>
            </div>

            <Textarea placeholder="Catatan verifikasi profil..." value={validationNotes} onChange={(e) => setValidationNotes(e.target.value)} />
            
            <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => validateFarmerMutation.mutate({farmerId: selectedFarmer.id, status: 'rejected'})}>Data Tidak Sesuai</Button>
                <Button className="flex-1 bg-blue-600" onClick={() => validateFarmerMutation.mutate({farmerId: selectedFarmer.id, status: 'approved'})}>Verifikasi Petani</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}