import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Scale, Calendar as CalendarIcon, MapPin, TreePine } from "lucide-react";

export default function HarvestForm({ lands, plants, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    land_id: "",
    plant_id: "general", // "general" jika panen seluruh lahan, atau ID tanaman spesifik
    commodity_name: "",
    weight_kg: "",
    harvest_date: new Date().toISOString().split('T')[0], // Default hari ini
    notes: ""
  });

  // Filter tanaman berdasarkan lahan yang dipilih
  const filteredPlants = useMemo(() => {
    if (!formData.land_id) return [];
    return plants.filter(p => p.land_id === formData.land_id);
  }, [plants, formData.land_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.land_id || !formData.weight_kg || !formData.commodity_name) return;
    
    onSubmit({
      ...formData,
      weight_kg: parseFloat(formData.weight_kg),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Pilih Lahan */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" /> Pilih Lahan
        </Label>
        <Select 
          value={formData.land_id} 
          onValueChange={(val) => setFormData(prev => ({ ...prev, land_id: val }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih lahan panen..." />
          </SelectTrigger>
          <SelectContent>
            {lands.map(land => (
              <SelectItem key={land.id} value={land.id}>{land.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pilih Tanaman (Opsional) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <TreePine className="w-4 h-4 text-emerald-600" /> Spesifik Tanaman (Opsional)
        </Label>
        <Select 
          disabled={!formData.land_id}
          value={formData.plant_id} 
          onValueChange={(val) => {
            const selectedPlant = filteredPlants.find(p => p.id === val);
            setFormData(prev => ({ 
              ...prev, 
              plant_id: val,
              commodity_name: selectedPlant ? selectedPlant.commodity_name : prev.commodity_name
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={formData.land_id ? "Pilih tanaman atau biarkan umum" : "Pilih lahan dahulu"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">Hasil Lahan Umum</SelectItem>
            {filteredPlants.map(plant => (
              <SelectItem key={plant.id} value={plant.id}>
                {plant.commodity_name} (ID: {plant.id.slice(-4)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nama Komoditas (Auto-fill jika pilih tanaman, tapi bisa manual) */}
      <div className="space-y-2">
        <Label>Nama Komoditas</Label>
        <Input 
          placeholder="Contoh: Kopi Arabika, Jagung, dll"
          value={formData.commodity_name}
          onChange={(e) => setFormData(prev => ({ ...prev, commodity_name: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Berat Panen */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" /> Berat (Kg)
          </Label>
          <Input 
            type="number" 
            step="0.1"
            placeholder="0.0"
            value={formData.weight_kg}
            onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
            required
          />
        </div>

        {/* Tanggal Panen */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-600" /> Tanggal
          </Label>
          <Input 
            type="date" 
            value={formData.harvest_date}
            onChange={(e) => setFormData(prev => ({ ...prev, harvest_date: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Catatan Tambahan */}
      <div className="space-y-2">
        <Label>Catatan (Opsional)</Label>
        <Input 
          placeholder="Kualitas bagus, cuaca cerah, dll"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Simpan Panen
        </Button>
      </div>
    </form>
  );
}