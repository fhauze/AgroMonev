import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePine, Calendar, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";

const commodities = [
  { name: "Kopi Arabika", category: "perkebunan" },
  { name: "Kopi Robusta", category: "perkebunan" },
  { name: "Kakao", category: "perkebunan" },
  { name: "Kelapa Sawit", category: "perkebunan" },
  { name: "Karet", category: "perkebunan" },
  { name: "Padi", category: "pangan" },
  { name: "Jagung", category: "pangan" },
  { name: "Kedelai", category: "pangan" },
  { name: "Cabai", category: "hortikultura" },
  { name: "Tomat", category: "hortikultura" },
  { name: "Bawang Merah", category: "hortikultura" },
  { name: "Jati", category: "kehutanan" },
  { name: "Sengon", category: "kehutanan" },
];

export default function PlantForm({ landId, farmerId, coordinates, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    land_id: landId,
    farmer_id: farmerId,
    commodity_name: "",
    latitude: coordinates?.lat || 0,
    longitude: coordinates?.lng || 0,
    plant_date: format(new Date(), "yyyy-MM-dd"),
    status: "alive",
    notes: "",
    sync_status: "pending"
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TreePine className="w-5 h-5 text-emerald-600" />
            Data Tanaman
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Komoditas</Label>
            <Select value={formData.commodity_name} onValueChange={(v) => handleChange("commodity_name", v)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Pilih komoditas" />
              </SelectTrigger>
              <SelectContent>
                {commodities.map(c => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name} <span className="text-slate-400">({c.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Tanam</Label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={formData.plant_date}
                  onChange={(e) => handleChange("plant_date", e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">Hidup</SelectItem>
                  <SelectItem value="dead">Mati</SelectItem>
                  <SelectItem value="sick">Sakit</SelectItem>
                  <SelectItem value="harvested">Dipanen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <MapPin className="w-4 h-4" />
              <span>Koordinat Titik Tanam</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleChange("latitude", parseFloat(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleChange("longitude", parseFloat(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Catatan (Opsional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Tambahkan catatan..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !formData.commodity_name} className="bg-emerald-600 hover:bg-emerald-700">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan Tanaman
        </Button>
      </div>
    </form>
  );
}