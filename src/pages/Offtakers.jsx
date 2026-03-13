import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/common/EmptyState";
import { Package, Plus, Phone, MapPin, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Offtakers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    user_email: "",
    company_name: "",
    contact_name: "",
    phone: "",
    address: "",
    is_active: true
  });

  const { data: offtakers = [], isLoading } = useQuery({
    queryKey: ["offtakers"],
    queryFn: () => {
      try{
        const data = base44.entities.Offtaker.list();
        return Array.isArray(data) ?  data : [];
      }catch(e){
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Offtaker.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offtakers"] });
      setShowForm(false);
      setFormData({ user_email: "", company_name: "", contact_name: "", phone: "", address: "", is_active: true });
      toast.success("Offtaker berhasil ditambahkan!");
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Offtaker.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offtakers"] });
      toast.success("Status offtaker diperbarui");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Offtaker.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offtakers"] });
      toast.success("Offtaker dihapus");
    }
  });

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offtaker</h1>
          <p className="text-slate-500">Kelola pembeli hasil panen</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Offtaker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Offtaker Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => setFormData(p => ({ ...p, user_email: e.target.value }))}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama Perusahaan *</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData(p => ({ ...p, company_name: e.target.value }))}
                    placeholder="PT. Example"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Kontak *</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData(p => ({ ...p, contact_name: e.target.value }))}
                    placeholder="Nama PIC"
                  />
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
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                  placeholder="Alamat lengkap"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button 
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.user_email || !formData.company_name || !formData.contact_name || createMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
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
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : offtakers.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offtakers.map(o => (
            <Card key={o.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{o.company_name}</p>
                      <p className="text-sm text-slate-500">{o.contact_name}</p>
                    </div>
                  </div>
                  <Switch
                    checked={o.is_active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: o.id, is_active: checked })}
                  />
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  {o.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {o.phone}</p>}
                  {o.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {o.address}</p>}
                  <p className="text-xs text-slate-400">{o.user_email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-red-600 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(o.id)}
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
          icon={Package}
          title="Belum ada offtaker"
          description="Tambahkan offtaker untuk grading hasil panen"
          action={() => setShowForm(true)}
          actionLabel="Tambah Offtaker"
        />
      )}
    </div>
  );
}