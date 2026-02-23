import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Package, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const gradeConfig = {
  A: { label: "Grade A - Premium", color: "text-emerald-600" },
  B: { label: "Grade B - Baik", color: "text-green-600" },
  C: { label: "Grade C - Standar", color: "text-amber-600" },
  D: { label: "Grade D - Rendah", color: "text-orange-600" }
};

export default function DistributionForm({ farmer, onSuccess, onClose, harvests = [] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    offtaker_id: "",
    harvest_id: "", // Tambahkan untuk tracking asal panen
    commodity_name: "",
    quantity_kg: "",
    farmer_grade: "",
    distribution_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Load offtakers
  const { data: offtakers = [] } = useQuery({
    queryKey: ["offtakers-active"],
    queryFn: () => base44.entities.Offtaker.filter({ is_active: true })
  });

  // Handler saat panen dipilih
  const handleHarvestChange = (harvestId) => {
    const selected = harvests.find(h => h.id === harvestId);
    
    if (selected) {
      setFormData(p => ({
        ...p,
        harvest_id: harvestId,
        commodity_name: selected.commodity_name,
        quantity_kg: selected.weight_kg.toString(),
      }));
    } else {
      setFormData(p => ({ ...p, harvest_id: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.offtaker_id || !formData.commodity_name || !formData.quantity_kg || !formData.farmer_grade) {
      toast.error("Lengkapi semua field yang wajib");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedOfftaker = offtakers.find(o => o.id === formData.offtaker_id);
      
      await base44.entities.Distribution.create({
        farmer_id: farmer.id,
        farmer_name: farmer.full_name,
        offtaker_id: formData.offtaker_id,
        offtaker_name: selectedOfftaker?.company_name || "",
        harvest_id: formData.harvest_id, // Simpan referensi panen
        commodity_name: formData.commodity_name,
        quantity_kg: parseFloat(formData.quantity_kg),
        farmer_grade: formData.farmer_grade,
        distribution_date: formData.distribution_date,
        notes: formData.notes,
        status: "pending"
      });

      toast.success("Distribusi berhasil dikirim!");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error("Gagal mengirim distribusi");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <Package className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Kirim ke Offtaker</h3>
          <p className="text-sm text-slate-500">Petani: {farmer?.full_name}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* PILIHAN DARI HARVEST */}
        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <Label className="text-indigo-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Pilih dari Data Panen (Opsional)
          </Label>
          <Select 
            value={formData.harvest_id} 
            onValueChange={handleHarvestChange}
          >
            <SelectTrigger className="w-full bg-white border-indigo-200 focus:ring-indigo-500">
              <SelectValue placeholder={harvests && harvests.length > 0 ? "Pilih hasil panen..." : "Tidak ada data panen tersedia"} />
            </SelectTrigger>
            <SelectContent>
              {/* Cek apakah harvests benar-benar array dan punya isi */}
              {Array.isArray(harvests) && harvests.length > 0 ? (
                <>
                  <SelectItem value="manual" className="text-slate-400 italic">
                    -- Tanpa Referensi Panen --
                  </SelectItem>
                  {harvests.map((h) => (
                    <SelectItem 
                      key={h.id} 
                      value={h.id.toString()}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{h.commodity_name}</span>
                        <span className="text-xs text-slate-500">
                          {h.weight_kg} Kg • {h.notes}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-sm text-slate-500">
                  Belum ada data panen terdaftar. <br/>
                  <span className="text-xs">Catat panen terlebih dahulu di tab Panen.</span>
                </div>
              )}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400">Memilih data panen akan mengisi nama komoditas dan berat secara otomatis.</p>
        </div>

        <div className="space-y-2">
          <Label>Pilih Offtaker *</Label>
          <Select 
            value={formData.offtaker_id} 
            onValueChange={(v) => setFormData(p => ({ ...p, offtaker_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih offtaker tujuan" />
            </SelectTrigger>
            <SelectContent>
              {offtakers.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  {o.company_name} - {o.contact_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Komoditas *</Label>
          <Input
            value={formData.commodity_name}
            onChange={(e) => setFormData(p => ({ ...p, commodity_name: e.target.value }))}
            placeholder="Contoh: Kopi Robusta"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Jumlah (Kg) *</Label>
            <Input
              type="number"
              value={formData.quantity_kg}
              onChange={(e) => setFormData(p => ({ ...p, quantity_kg: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Kirim *</Label>
            <Input
              type="date"
              value={formData.distribution_date}
              onChange={(e) => setFormData(p => ({ ...p, distribution_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Grade Barang (Klaim Petani) *</Label>
          <div className="grid grid-cols-4 gap-2">
            {["A", "B", "C", "D"].map(grade => (
              <Button
                key={grade}
                type="button"
                variant={formData.farmer_grade === grade ? "default" : "outline"}
                className={`h-12 ${formData.farmer_grade === grade ? "bg-indigo-600" : ""}`}
                onClick={() => setFormData(p => ({ ...p, farmer_grade: grade }))}
              >
                {grade}
              </Button>
            ))}
          </div>
          {formData.farmer_grade && (
            <p className={`text-sm font-medium ${gradeConfig[formData.farmer_grade]?.color}`}>
              {gradeConfig[formData.farmer_grade]?.label}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Catatan</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
            placeholder="Catatan tambahan (kondisi kemasan, supir, dll)..."
            rows={2}
          />
        </div>

        <Button
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          Konfirmasi Pengiriman
        </Button>
      </div>
    </div>
  );
}