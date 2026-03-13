import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/common/EmptyState";
import { Shield, Plus, MapPin, Phone, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { da } from "date-fns/locale";

const roleLabels = {
  kepala_desa: "Kepala Desa",
  kepala_dusun: "Kepala Dusun",
  rt: "Ketua RT",
  rw: "Ketua RW"
};

export default function Validators() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    user_email: "",
    full_name: "",
    role: "kepala_desa",
    village: "",
    district: "",
    regency: "",
    province: "",
    phone: "",
    is_active: true
  });

  const {data: provinces = []} = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      try{
        const data = base44.entities.Province.list();
        if (data && Array.isArray(data)) {
          return data;
        }
        return [];
      }catch(e){
        console.warn('gagal meemuat data dari server');
        return [];
      }
    }
  });

  const { data: validators = [], isLoading, error } = useQuery({
    queryKey: ["validators"],
    queryFn: () => {
      try{
        const res = base44.entities.Validator.list();
        return Array.isArray(res) ? res : [];
      }catch(ex){
        return [];
      }
      
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (error) {
    return <div className="p-6 text-red-600">
      Gagal memuat validator (offline mock belum siap)
    </div>;
  }

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try{
        const actServer = base44.entities.Validator.create(data);
        if(typeof actServer === 'string' && actServer.includes('<!doctype html')){
          throw new Error('Data is HTML file, not a good responds');
        }
        return actServer;
      }catch(err){
        throw {type: 'OFFLINE_SAVE', data}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validators"] });
      setShowForm(false);
      setFormData({ user_email: "", full_name: "", role: "kepala_desa", village: "", district: "", regency: "", phone: "", is_active: true });
      toast.success("Validator berhasil ditambahkan!");
    },
    onError: async (error, datas)=>{
      if(error.type === 'OFFLINE_SAVE'){{
        console.log('Error menyimpan online dan akan disimpan offline')
      }}
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Validator.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validators"] });
      toast.success("Status validator diperbarui");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Validator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validators"] });
      toast.success("Validator dihapus");
    }
  });

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Validator Lahan</h1>
          <p className="text-slate-500">Kelola validator untuk verifikasi lahan</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Validator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Validator Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => setFormData(p => ({ ...p, user_email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama Lengkap *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Nama lengkap"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jabatan *</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kepala_desa">Kepala Desa</SelectItem>
                      <SelectItem value="kepala_dusun">Kepala Dusun</SelectItem>
                      <SelectItem value="rt">Ketua RT</SelectItem>
                      <SelectItem value="rw">Ketua RW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Telepon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="08xxx"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Desa *</Label>
                  <Input
                    value={formData.village}
                    onChange={(e) => setFormData(p => ({ ...p, village: e.target.value }))}
                    placeholder="Nama desa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kecamatan</Label>
                  <Input
                    value={formData.district}
                    onChange={(e) => setFormData(p => ({ ...p, district: e.target.value }))}
                    placeholder="Kecamatan"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kabupaten</Label>
                  <Input
                    value={formData.regency}
                    onChange={(e) => setFormData(p => ({ ...p, regency: e.target.value }))}
                    placeholder="Kabupaten"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provinsi</Label>
                  <Select value={formData.province || ""} onValueChange={(v) => handleChange("province", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                    <SelectContent>
                      {provinces.map(p => (<SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button 
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.user_email || !formData.full_name || !formData.village || createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : validators.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validators.map(v => (
            <Card key={v.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{v.full_name}</p>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{roleLabels[v.role]}</Badge>
                    </div>
                  </div>
                  <Switch
                    checked={v.is_active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: v.id, is_active: checked })}
                  />
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> 
                    {v.village}, {v.district}, {v.regency}, 
                    {provinces.find(p => p.id === v.province)?.nama}
                  </p>
                  {v.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {v.phone}</p>}
                  <p className="text-xs text-slate-400">{v.user_email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-red-600 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(v.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Shield}
          title="Belum ada validator"
          description="Tambahkan validator untuk memverifikasi lahan di wilayah tertentu"
          action={() => setShowForm(true)}
          actionLabel="Tambah Validator"
        />
      )}
    </div>
  );
}