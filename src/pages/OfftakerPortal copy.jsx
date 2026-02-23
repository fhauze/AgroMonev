import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/common/EmptyState";
import { 
  Package, Star, LogOut, Loader2, CheckCircle, XCircle, 
  Clock, AlertTriangle, Scale, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const gradeConfig = {
  A: { label: "Grade A", color: "bg-emerald-100 text-emerald-700", description: "Kualitas Premium" },
  B: { label: "Grade B", color: "bg-green-100 text-green-700", description: "Kualitas Baik" },
  C: { label: "Grade C", color: "bg-amber-100 text-amber-700", description: "Kualitas Standar" },
  D: { label: "Grade D", color: "bg-orange-100 text-orange-700", description: "Kualitas Rendah" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", description: "Tidak Memenuhi Standar" }
};

export default function OfftakerPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [offtaker, setOfftaker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHarvest, setSelectedHarvest] = useState(null);
  const [gradeForm, setGradeForm] = useState({ grade: "", notes: "", price_per_kg: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const offtakers = await base44.entities.Offtaker.filter({ user_email: currentUser.email });
        if (offtakers.length > 0 && offtakers[0].is_active) {
          setOfftaker(offtakers[0]);
        }
      } catch (error) {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Load harvests pending grading
  const { data: pendingHarvests = [] } = useQuery({
    queryKey: ["pending-harvests"],
    queryFn: () => base44.entities.Harvest.filter({ status: "pending_grade" }),
    enabled: !!offtaker
  });

  // Load graded harvests by this offtaker
  const { data: gradedHarvests = [] } = useQuery({
    queryKey: ["graded-harvests", offtaker?.user_email],
    queryFn: () => base44.entities.Harvest.filter({ graded_by: offtaker.user_email }),
    enabled: !!offtaker
  });

  // Load farmers for reference
  const { data: farmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: () => base44.entities.Farmer.list(),
    enabled: !!offtaker
  });

  // Grade mutation
  const gradeMutation = useMutation({
    mutationFn: async () => {
      const totalValue = parseFloat(gradeForm.price_per_kg) * selectedHarvest.quantity_kg;
      await base44.entities.Harvest.update(selectedHarvest.id, {
        grade: gradeForm.grade,
        grade_notes: gradeForm.notes,
        price_per_kg: parseFloat(gradeForm.price_per_kg),
        total_value: totalValue,
        graded_by: offtaker.user_email,
        graded_by_name: offtaker.contact_name,
        graded_at: new Date().toISOString(),
        status: gradeForm.grade === "rejected" ? "rejected" : "graded"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-harvests"] });
      queryClient.invalidateQueries({ queryKey: ["graded-harvests"] });
      setSelectedHarvest(null);
      setGradeForm({ grade: "", notes: "", price_per_kg: "" });
      toast.success("Grading berhasil disimpan!");
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Offtaker</h1>
              <p className="text-slate-500 mb-8">
                Masuk untuk melakukan grading hasil panen
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

  if (!offtaker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h1>
              <p className="text-slate-500 mb-4">
                Email <span className="font-medium">{user.email}</span> tidak terdaftar sebagai offtaker.
              </p>
              <p className="text-sm text-slate-400 mb-8">
                Hubungi admin untuk mendaftarkan Anda sebagai offtaker.
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{offtaker.company_name}</h1>
              <p className="text-sm text-slate-500">{offtaker.contact_name}</p>
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
            <p className="text-2xl font-bold text-slate-900">{pendingHarvests.length}</p>
            <p className="text-xs text-slate-500">Pending Grade</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{gradedHarvests.filter(h => h.status === "graded").length}</p>
            <p className="text-xs text-slate-500">Sudah Grading</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <Scale className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              {gradedHarvests.reduce((sum, h) => sum + (h.quantity_kg || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Total Kg</p>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="w-full bg-white shadow-sm p-1 h-auto">
              <TabsTrigger value="pending" className="flex-1 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                <Clock className="w-4 h-4 mr-2" />
                Pending ({pendingHarvests.length})
              </TabsTrigger>
              <TabsTrigger value="graded" className="flex-1 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                <Star className="w-4 h-4 mr-2" />
                Riwayat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingHarvests.length > 0 ? (
                <div className="grid gap-4">
                  {pendingHarvests.map(harvest => (
                    <Card key={harvest.id} className="border-0 shadow-sm overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{harvest.commodity_name}</h3>
                            <p className="text-sm text-slate-500">Petani: {getFarmerName(harvest.farmer_id)}</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700">Pending Grade</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-slate-500">Jumlah</p>
                            <p className="font-semibold">{harvest.quantity_kg} Kg</p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-slate-500">Tanggal Panen</p>
                            <p className="font-semibold">
                              {harvest.harvest_date ? format(new Date(harvest.harvest_date), "dd MMM yyyy", { locale: id }) : "-"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => {
                            setSelectedHarvest(harvest);
                            setGradeForm({ grade: "", notes: "", price_per_kg: "" });
                          }}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Lakukan Grading
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="Tidak ada hasil panen pending"
                  description="Semua hasil panen sudah di-grading"
                />
              )}
            </TabsContent>

            <TabsContent value="graded" className="space-y-4">
              {gradedHarvests.length > 0 ? (
                <div className="grid gap-3">
                  {gradedHarvests.map(h => (
                    <Card key={h.id} className="border-0 shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{h.commodity_name}</p>
                          <p className="text-sm text-slate-500">
                            {h.quantity_kg} Kg • {h.graded_at ? format(new Date(h.graded_at), "dd MMM yyyy", { locale: id }) : "-"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={gradeConfig[h.grade]?.color || "bg-slate-100 text-slate-700"}>
                            {gradeConfig[h.grade]?.label || h.grade}
                          </Badge>
                          {h.total_value && (
                            <p className="text-sm font-semibold text-emerald-600 mt-1">
                              Rp {h.total_value.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {h.grade_notes && (
                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">{h.grade_notes}</p>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Star}
                  title="Belum ada riwayat"
                  description="Riwayat grading akan muncul di sini"
                />
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Grading Dialog */}
      <Dialog open={!!selectedHarvest} onOpenChange={() => setSelectedHarvest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grading Hasil Panen</DialogTitle>
          </DialogHeader>
          
          {selectedHarvest && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Komoditas</p>
                    <p className="font-semibold">{selectedHarvest.commodity_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Jumlah</p>
                    <p className="font-semibold">{selectedHarvest.quantity_kg} Kg</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pilih Grade *</Label>
                <div className="grid grid-cols-5 gap-2">
                  {["A", "B", "C", "D", "rejected"].map(grade => (
                    <Button
                      key={grade}
                      type="button"
                      variant={gradeForm.grade === grade ? "default" : "outline"}
                      className={`h-12 ${gradeForm.grade === grade ? "bg-indigo-600" : ""}`}
                      onClick={() => setGradeForm(p => ({ ...p, grade }))}
                    >
                      {grade === "rejected" ? "X" : grade}
                    </Button>
                  ))}
                </div>
                {gradeForm.grade && (
                  <p className="text-sm text-slate-500">{gradeConfig[gradeForm.grade]?.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Harga per Kg (Rp) *</Label>
                <Input
                  type="number"
                  value={gradeForm.price_per_kg}
                  onChange={(e) => setGradeForm(p => ({ ...p, price_per_kg: e.target.value }))}
                  placeholder="0"
                />
                {gradeForm.price_per_kg && (
                  <p className="text-sm text-emerald-600 font-medium">
                    Total: Rp {(parseFloat(gradeForm.price_per_kg) * selectedHarvest.quantity_kg).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={gradeForm.notes}
                  onChange={(e) => setGradeForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Catatan kualitas, kondisi, dll"
                  rows={3}
                />
              </div>

              <Button
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => gradeMutation.mutate()}
                disabled={!gradeForm.grade || !gradeForm.price_per_kg || gradeMutation.isPending}
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Simpan Grading
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}