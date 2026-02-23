import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMap } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TreePine, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { format } from "date-fns";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 19);
    }
  }, [center, map]);
  return null;
}

export default function GPSPlantTagger({ 
  landId, 
  farmerId, 
  landPolygon,
  existingPlants = [],
  onTagPlant,
  isLoading 
}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagData, setTagData] = useState({
    commodity_name: "",
    plant_date: format(new Date(), "yyyy-MM-dd"),
    notes: ""
  });

  // Start GPS tracking
  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      toast.error("GPS tidak didukung di perangkat ini");
      return;
    }

    setIsLocating(true);
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLocation([latitude, longitude]);
        setGpsAccuracy(accuracy);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Izin GPS ditolak. Aktifkan GPS di pengaturan.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Lokasi tidak tersedia. Pastikan GPS aktif.");
            break;
          case error.TIMEOUT:
            toast.error("Waktu pencarian lokasi habis. Coba lagi.");
            break;
          default:
            toast.error("Gagal mendapatkan lokasi");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    
    setWatchId(id);
  };

  // Stop GPS tracking
  const stopGPSTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  useEffect(() => {
    startGPSTracking();
    return () => stopGPSTracking();
  }, []);

  // Open tag dialog
  const handleTagClick = () => {
    if (!currentLocation) {
      toast.error("Tunggu GPS menemukan lokasi Anda");
      return;
    }
    setShowTagDialog(true);
  };

  // Submit tag
  const handleSubmitTag = () => {
    if (!tagData.commodity_name) {
      toast.error("Pilih jenis tanaman");
      return;
    }

    onTagPlant({
      land_id: landId,
      farmer_id: farmerId,
      commodity_name: tagData.commodity_name,
      latitude: currentLocation[0],
      longitude: currentLocation[1],
      plant_date: tagData.plant_date,
      status: "alive",
      notes: tagData.notes,
      sync_status: "pending"
    });

    setShowTagDialog(false);
    setTagData({
      commodity_name: "",
      plant_date: format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
  };

  const currentLocationIcon = new L.DivIcon({
    className: "current-location-icon",
    html: `<div style="
      width: 24px; 
      height: 24px; 
      background: #3b82f6; 
      border-radius: 50%; 
      border: 4px solid white; 
      box-shadow: 0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const plantIcon = new L.DivIcon({
    className: "plant-icon",
    html: `<div style="
      width: 28px; 
      height: 28px; 
      background: #16a34a; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">🌱</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  // Convert polygon coordinates for display
  const polygonPositions = landPolygon?.map(c => [c[1], c[0]]) || [];

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden">
        {/* GPS Status & Tag Button */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-4">
          {/* GPS Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentLocation ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {isLocating ? "Mencari lokasi GPS..." : currentLocation ? "GPS Aktif" : "GPS Tidak Aktif"}
                </p>
                {gpsAccuracy && (
                  <p className="text-xs text-slate-500">Akurasi: ±{gpsAccuracy.toFixed(0)} meter</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              {existingPlants.length} tanaman
            </Badge>
          </div>

          {/* Tag Button */}
          <Button
            onClick={handleTagClick}
            disabled={!currentLocation || isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            ) : (
              <TreePine className="w-6 h-6 mr-2" />
            )}
            Tag Tanaman di Lokasi Ini
          </Button>

          {currentLocation && (
            <p className="text-xs text-slate-500 text-center">
              Koordinat: {currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}
            </p>
          )}
        </div>

        {/* Map */}
        <div className="h-[350px] relative">
          <MapContainer 
            center={currentLocation || (polygonPositions.length > 0 ? polygonPositions[0] : [-6.2, 106.8])} 
            zoom={18} 
            className="h-full w-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {currentLocation && (
              <MapController center={currentLocation} />
            )}

            {/* Land polygon */}
            {polygonPositions.length >= 3 && (
              <Polygon 
                positions={polygonPositions} 
                pathOptions={{ 
                  color: "#16a34a", 
                  fillColor: "#16a34a", 
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "5, 5"
                }} 
              />
            )}

            {/* Current location marker */}
            {currentLocation && (
              <Marker position={currentLocation} icon={currentLocationIcon} />
            )}

            {/* Existing plants */}
            {existingPlants.map((plant, idx) => (
              <Marker 
                key={plant.id || idx} 
                position={[plant.latitude, plant.longitude]} 
                icon={plantIcon}
              />
            ))}
          </MapContainer>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg z-[1000]">
            <p className="text-sm text-slate-700 text-center">
              <span className="font-semibold">Petunjuk:</span> Berdiri di dekat tanaman, lalu tekan tombol 
              <span className="font-semibold text-emerald-600"> "Tag Tanaman"</span> untuk menandai posisi.
            </p>
          </div>
        </div>
      </Card>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreePine className="w-5 h-5 text-emerald-600" />
              Tag Tanaman Baru
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {currentLocation && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Koordinat GPS</p>
                <p className="text-sm font-mono font-medium text-slate-700">
                  {currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Jenis Tanaman *</Label>
              <Select 
                value={tagData.commodity_name} 
                onValueChange={(v) => setTagData(prev => ({ ...prev, commodity_name: v }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih jenis tanaman" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Tanam</Label>
              <Input
                type="date"
                value={tagData.plant_date}
                onChange={(e) => setTagData(prev => ({ ...prev, plant_date: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Input
                value={tagData.notes}
                onChange={(e) => setTagData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Contoh: Bibit dari kebun sendiri"
                className="h-11"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowTagDialog(false)}
              >
                Batal
              </Button>
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmitTag}
                disabled={!tagData.commodity_name || isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}