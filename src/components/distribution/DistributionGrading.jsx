import { useState } from "react";
import  base44  from "@/api/Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const gradeConfig = {
  A: { label: "Grade A", color: "bg-emerald-100 text-emerald-700", value: 4 },
  B: { label: "Grade B", color: "bg-green-100 text-green-700", value: 3 },
  C: { label: "Grade C", color: "bg-amber-100 text-amber-700", value: 2 },
  D: { label: "Grade D", color: "bg-orange-100 text-orange-700", value: 1 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", value: 0 }
};

export default function DistributionGrading({ distribution, offtaker, onSuccess, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    offtaker_grade: distribution?.farmer_grade || "",
    grade_difference_reason: "",
    price_per_kg: ""
  });

  const farmerGradeValue = gradeConfig[distribution?.farmer_grade]?.value || 0;
  const offtakerGradeValue = gradeConfig[formData.offtaker_grade]?.value || 0;
  const isDowngraded = formData.offtaker_grade && offtakerGradeValue < farmerGradeValue;

  const handleSubmit = async () => {
    if (!formData.offtaker_grade || !formData.price_per_kg) {
      toast.error("Lengkapi grade dan harga");
      return;
    }

    if (isDowngraded && !formData.grade_difference_reason) {
      toast.error("Berikan alasan penurunan grade");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalValue = parseFloat(formData.price_per_kg) * distribution.quantity_kg;
      
      await base44.entities.Distribution.update(distribution.id, {
        offtaker_grade: formData.offtaker_grade,
        grade_difference_reason: formData.grade_difference_reason,
        price_per_kg: parseFloat(formData.price_per_kg),
        total_value: totalValue,
        received_date: new Date().toISOString().split("T")[0],
        status: formData.offtaker_grade === "rejected" ? "rejected" : "graded"
      });

      toast.success("Grading berhasil disimpan!");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error("Gagal menyimpan grading");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Distribution Info */}
      <div className="p-4 bg-slate-50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">{distribution?.commodity_name}</p>
            <p className="text-sm text-slate-500">Dari: {distribution?.farmer_name}</p>
          </div>
          <Badge className={gradeConfig[distribution?.farmer_grade]?.color}>
            Klaim: {distribution?.farmer_grade}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Jumlah</p>
            <p className="font-semibold">{distribution?.quantity_kg} Kg</p>
          </div>
          <div>
            <p className="text-slate-500">Tanggal Kirim</p>
            <p className="font-semibold">
              {distribution?.distribution_date ? 
                format(new Date(distribution.distribution_date), "dd MMM yyyy", { locale: id }) : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Grade Selection */}
      <div className="space-y-2">
        <Label>Grade Setelah Diterima *</Label>
        <div className="grid grid-cols-5 gap-2">
          {["A", "B", "C", "D", "rejected"].map(grade => (
            <Button
              key={grade}
              type="button"
              variant={formData.offtaker_grade === grade ? "default" : "outline"}
              className={`h-12 ${formData.offtaker_grade === grade ? 
                (grade === "rejected" ? "bg-red-600" : "bg-indigo-600") : ""}`}
              onClick={() => setFormData(p => ({ ...p, offtaker_grade: grade }))}
            >
              {grade === "rejected" ? "X" : grade}
            </Button>
          ))}
        </div>
      </div>

      {/* Downgrade Warning */}
      {isDowngraded && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <ArrowDown className="w-4 h-4" />
            <span className="font-medium">Grade Diturunkan</span>
          </div>
          <p className="text-sm text-amber-600 mb-3">
            Grade petani: {distribution?.farmer_grade} → Grade Anda: {formData.offtaker_grade}
          </p>
          <div className="space-y-2">
            <Label className="text-amber-700">Alasan Penurunan Grade *</Label>
            <Textarea
              value={formData.grade_difference_reason}
              onChange={(e) => setFormData(p => ({ ...p, grade_difference_reason: e.target.value }))}
              placeholder="Contoh: Kondisi barang rusak saat pengiriman, kematangan tidak sesuai, dll"
              rows={2}
              className="border-amber-200"
            />
          </div>
        </div>
      )}

      {/* Price */}
      <div className="space-y-2">
        <Label>Harga per Kg (Rp) *</Label>
        <Input
          type="number"
          value={formData.price_per_kg}
          onChange={(e) => setFormData(p => ({ ...p, price_per_kg: e.target.value }))}
          placeholder="0"
        />
        {formData.price_per_kg && (
          <p className="text-sm text-emerald-600 font-medium">
            Total: Rp {(parseFloat(formData.price_per_kg) * distribution.quantity_kg).toLocaleString()}
          </p>
        )}
      </div>

      <Button
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="w-5 h-5 mr-2" />
        )}
        Simpan Grading
      </Button>
    </div>
  );
}