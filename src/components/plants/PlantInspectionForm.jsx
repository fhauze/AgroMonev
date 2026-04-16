import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, AlertTriangle, Bug, Leaf, Cloud, Droplets, 
  Loader2, Camera, X
} from "lucide-react";
import { toast } from "sonner";

const healthOptions = [
  { value: "healthy", label: "Sehat", icon: CheckCircle, color: "text-emerald-600" },
  { value: "mild_issue", label: "Masalah Ringan", icon: AlertTriangle, color: "text-amber-500" },
  { value: "moderate_issue", label: "Masalah Sedang", icon: AlertTriangle, color: "text-orange-500" },
  { value: "severe_issue", label: "Masalah Berat", icon: AlertTriangle, color: "text-red-500" }
];

const productivityOptions = [
  { value: "productive", label: "Produktif" },
  { value: "less_productive", label: "Kurang Produktif" },
  { value: "not_productive", label: "Tidak Produktif" }
];

const issueOptions = [
  { value: "none", label: "Tidak Ada Masalah", icon: CheckCircle },
  { value: "pest", label: "Hama", icon: Bug },
  { value: "disease", label: "Penyakit", icon: Leaf },
  { value: "weather", label: "Cuaca Buruk", icon: Cloud },
  { value: "nutrient_deficiency", label: "Kekurangan Nutrisi", icon: Leaf },
  { value: "water_shortage", label: "Kekurangan Air", icon: Droplets },
  { value: "other", label: "Lainnya", icon: AlertTriangle }
];

export default function PlantInspectionForm({ plant,farmer_id, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    health_status: "healthy",
    productivity_status: "productive",
    issue_type: "none",
    issue_description: "",
    recommendation: "",
    notes: "",
  });

  const inspectionMutation = useMutation({
    mutationFn: async (data) => {
      console.log("create inspection", data)
      try{
        const existingInspeksi = await entity('map', 'inspeksi').find({
          petani_id: farmer_id,
          lahan_id: plant.lahan_id,
          tanaman_id: plant.id
        });

        console.log(existingInspeksi.data.data, 'inspeksi');
        const payload = {
          tanaman_id: plant.id,
          lahan_id: plant.lahan_id,
          petani_id: farmer_id,
          inspection_date: new Date().toISOString(),
          ...data
        };
        if (existingInspeksi.data.data && existingInspeksi.data.data.length > 0) {
          const idToUpdate = existingInspeksi.data.data[0].id;
          await entity('map', 'inspeksi').update(idToUpdate, payload);
          console.log("Data updated successfully");
        } else {
          await entity('map', 'inspeksi').create(payload);
          console.log("Data created successfully");
        }
        // await entity('map', 'inspeksi').create({
        //   'tanaman_id' : plant.id,
        //   "lahan_id" : plant.lahan_id,
        //   "petani_id" : farmer_id,
        //   inspection_date: new Date().toISOString(),
        //   ...data
        // });
      }catch(e){
        console.error("Insert failed : ", e)
      }

      // Update plant status
      const plantStatus = form.health_status === "severe_issue" ? "sick" : 
                          form.health_status === "healthy" ? "alive" : "alive";
      
      // await entity('map', 'inspeksi').update(plant.id, {
      //   status: plantStatus,
      //   productivity_status: form.productivity_status,
      //   issue_type: form.issue_type,
      //   issue_description: form.issue_description,
      //   last_inspection_date: new Date().toISOString().split('T')[0]
      // });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-plants"] });
      toast.success("Inspeksi berhasil disimpan!");
      onSuccess?.();
      onClose?.();
    }
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Inspeksi Tanaman</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-sm text-slate-500">{plant.commodity_name}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Status */}
        <div className="space-y-2">
          <Label>Status Kesehatan *</Label>
          <div className="grid grid-cols-2 gap-2">
            {healthOptions.map(option => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={form.health_status === option.value ? "default" : "outline"}
                  className={`justify-start h-auto py-3 ${form.health_status === option.value ? "bg-slate-800" : ""}`}
                  onClick={() => setForm(p => ({ ...p, health_status: option.value }))}
                >
                  <Icon className={`w-4 h-4 mr-2 ${form.health_status === option.value ? "text-white" : option.color}`} />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Productivity Status */}
        <div className="space-y-2">
          <Label>Status Produktivitas *</Label>
          <Select value={form.productivity_status} onValueChange={(v) => setForm(p => ({ ...p, productivity_status: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {productivityOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Issue Type */}
        <div className="space-y-2">
          <Label>Jenis Masalah</Label>
          <Select value={form.issue_type} onValueChange={(v) => setForm(p => ({ ...p, issue_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {issueOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Issue Description */}
        {form.issue_type !== "none" && (
          <div className="space-y-2">
            <Label>Deskripsi Masalah</Label>
            <Textarea
              value={form.issue_description}
              onChange={(e) => setForm(p => ({ ...p, issue_description: e.target.value }))}
              placeholder="Jelaskan kondisi masalah yang ditemukan..."
              rows={3}
            />
          </div>
        )}

        {/* Recommendation */}
        <div className="space-y-2">
          <Label>Rekomendasi Tindakan</Label>
          <Textarea
            value={form.recommendation}
            onChange={(e) => setForm(p => ({ ...p, recommendation: e.target.value }))}
            placeholder="Saran penanganan atau perawatan..."
            rows={2}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Catatan Tambahan</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Catatan lainnya..."
            rows={2}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => inspectionMutation.mutate(form)}
            disabled={inspectionMutation.isPending}
          >
            {inspectionMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Simpan Inspeksi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}