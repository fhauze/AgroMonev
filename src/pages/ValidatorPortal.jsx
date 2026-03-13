import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
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
  User, MapPin, Loader2, FileCheck, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const roleLabels = {
  kepala_desa: "Kepala Desa",
  kepala_dusun: "Kepala Dusun",
  rt: "Ketua RT",
  rw: "Ketua RW"
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
  const [selectedLand, setSelectedLand] = useState(null);
  const [validationNotes, setValidationNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const validators = await base44.entities.Validator.filter({ user_email: currentUser.email });
        if (validators.length > 0 && validators[0].is_active) {
          setValidator(validators[0]);
        }
      } catch (error) {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Load lands in validator's area that need validation
  const { data: lands = [] } = useQuery({
    queryKey: ["validator-lands", validator?.village],
    queryFn: () => base44.entities.Land.filter({ village: validator.village }),
    enabled: !!validator?.village
  });

  // Load farmers for reference
  const { data: farmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: () => base44.entities.Farmer.list(),
    enabled: !!validator
  });

  // Load validation history
  const { data: validations = [] } = useQuery({
    queryKey: ["validations", validator?.id],
    queryFn: () => base44.entities.LandValidation.filter({ validator_email: validator.user_email }),
    enabled: !!validator
  });

  // Validate land mutation
  const validateMutation = useMutation({
    mutationFn: async ({ landId, status }) => {
      const validationStatus = status === "approved" ? "valid" : "invalid";
      
      // Update land status
      await base44.entities.Land.update(landId, { 
        validation_status: validationStatus,
        validation_notes: validationNotes
      });
      
      // Create validation record
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
      toast.success("Validasi berhasil disimpan!");
    }
  });

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getFarmerName = (farmerId) => {
    const farmer = farmers.find(f => f.id === farmerId);
    return farmer?.full_name || "Tidak diketahui";
  };

  const pendingLands = lands.filter(l => l.validation_status === "pending" || l.validation_status === "need_review");
  const validatedLands = lands.filter(l => l.validation_status === "valid" || l.validation_status === "invalid");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Validator</h1>
              <p className="text-slate-500 mb-8">
                Masuk untuk memvalidasi lahan di wilayah Anda
              </p>
              <Button onClick={handleLogin} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg">
                Masuk
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!validator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h1>
              <p className="text-slate-500 mb-4">
                Email <span className="font-medium">{user.email}</span> tidak terdaftar sebagai validator.
              </p>
              <p className="text-sm text-slate-400 mb-8">
                Hubungi admin untuk mendaftarkan Anda sebagai validator wilayah.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{validator.full_name}</h1>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                {roleLabels[validator.role]} - {validator.village}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{pendingLands.length}</p>
            <p className="text-xs text-slate-500">Perlu Validasi</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{validations.filter(v => v.status === "approved").length}</p>
            <p className="text-xs text-slate-500">Disetujui</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{validations.filter(v => v.status === "rejected").length}</p>
            <p className="text-xs text-slate-500">Ditolak</p>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="w-full bg-white shadow-sm p-1 h-auto">
              <TabsTrigger value="pending" className="flex-1 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <Clock className="w-4 h-4 mr-2" />
                Perlu Validasi ({pendingLands.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <FileCheck className="w-4 h-4 mr-2" />
                Riwayat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingLands.length > 0 ? (
                <div className="grid gap-4">
                  {pendingLands.map(land => (
                    <Card key={land.id} className="border-0 shadow-sm overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{land.name}</h3>
                            <p className="text-sm text-slate-500">Pemilik: {getFarmerName(land.farmer_id)}</p>
                          </div>
                          <Badge className={`${statusStyles[land.validation_status]?.bg} ${statusStyles[land.validation_status]?.text}`}>
                            {statusStyles[land.validation_status]?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {land.village}, {land.district}
                          </span>
                          <span>{land.area_hectares?.toFixed(2)} Ha</span>
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => setSelectedLand(land)}
                        >
                          Validasi Lahan
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="Semua lahan sudah divalidasi"
                  description="Tidak ada lahan yang perlu divalidasi saat ini"
                />
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {validations.length > 0 ? (
                <div className="grid gap-3">
                  {validations.map(v => {
                    const land = lands.find(l => l.id === v.land_id);
                    return (
                      <Card key={v.id} className="border-0 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{land?.name || "Lahan"}</p>
                            <p className="text-sm text-slate-500">
                              {v.validated_at ? format(new Date(v.validated_at), "dd MMM yyyy, HH:mm", { locale: id }) : "-"}
                            </p>
                          </div>
                          <Badge className={v.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                            {v.status === "approved" ? "Disetujui" : "Ditolak"}
                          </Badge>
                        </div>
                        {v.notes && <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">{v.notes}</p>}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={FileCheck}
                  title="Belum ada riwayat"
                  description="Riwayat validasi akan muncul di sini"
                />
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Validation Dialog */}
      <Dialog open={!!selectedLand} onOpenChange={() => setSelectedLand(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validasi Lahan: {selectedLand?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedLand && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Pemilik</p>
                  <p className="font-medium">{getFarmerName(selectedLand.farmer_id)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Luas</p>
                  <p className="font-medium">{selectedLand.area_hectares?.toFixed(4)} Ha</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg col-span-2">
                  <p className="text-slate-500">Lokasi</p>
                  <p className="font-medium">{selectedLand.village}, {selectedLand.district}, {selectedLand.regency}</p>
                </div>
              </div>

              <div className="h-[300px] rounded-lg overflow-hidden">
                <LandMap
                  center={[selectedLand.center_lat || -6.2, selectedLand.center_lng || 106.8]}
                  zoom={17}
                  lands={[selectedLand]}
                  readOnly={true}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catatan Validasi</label>
                <Textarea
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Tambahkan catatan validasi (opsional)"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => validateMutation.mutate({ landId: selectedLand.id, status: "rejected" })}
                  disabled={validateMutation.isPending}
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Tolak
                </Button>
                <Button
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => validateMutation.mutate({ landId: selectedLand.id, status: "approved" })}
                  disabled={validateMutation.isPending}
                >
                  {validateMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  )}
                  Setujui
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}