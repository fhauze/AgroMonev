import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMap,Circle } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TreePine, Navigation, Loader2, AlertCircle } from "lucide-react";
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

/**
 * Helper function: Ray-casting algorithm untuk mengecek apakah titik di dalam poligon
 */
const isPointInPolygon = (point, polygon) => {
  if (!point || !polygon || polygon.length < 3) return true;
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // map.flyTo(center, 19);
      map.flyTo(center, 21, {
        duration: 1.5
      });
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

  // Memproses data polygon lahan
  const polygonPositions = useMemo(() => {
    if (!landPolygon) return [];
    try {
      const rawData = typeof landPolygon === 'string' 
        ? JSON.parse(landPolygon) 
        : landPolygon;
      if (!Array.isArray(rawData)) return [];
      return rawData.map(c => [
        parseFloat(c[1]), 
        parseFloat(c[0])
      ]);
    } catch (error) {
      console.error("Gagal memproses landPolygon di Tagger:", error);
      return [];
    }
  }, [landPolygon]);

  // Validasi Real-time: Apakah user di dalam poligon?
  const isInsideLahan = useMemo(() => {
    if (!currentLocation || polygonPositions.length < 3) return true;
    return isPointInPolygon(currentLocation, polygonPositions);
  }, [currentLocation, polygonPositions]);

  // Open tag dialog dengan Validasi
  const handleTagClick = () => {
    const MINIMUM_ACCURACY = 5;

    if (gpsAccuracy > MINIMUM_ACCURACY) {
      toast.warning(`Akurasi GPS kurang baik (±${gpsAccuracy.toFixed(0)}m)`, {
        description: "Mohon tunggu sebentar atau bergerak ke area terbuka hingga akurasi di bawah 5m."
      });
      return;
    }
    
    if (!isInsideLahan) {
      toast.error("Posisi di luar lahan!");
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
      background: ${isInsideLahan ? '#3b82f6' : '#ef4444'}; 
      border-radius: 50%; 
      border: 4px solid white; 
      box-shadow: 0 0 0 2px ${isInsideLahan ? '#3b82f6' : '#ef4444'}, 0 2px 8px rgba(0,0,0,0.3);
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

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden">
        {/* GPS Status & Tag Button */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-4">
          {/* GPS Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                !currentLocation ? "bg-amber-500" : (isInsideLahan ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-bounce")
              }`} />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {isLocating ? "Mencari lokasi GPS..." : 
                   currentLocation ? (isInsideLahan ? "GPS Aktif (Di Dalam Lahan)" : "Posisi di Luar Batas Lahan!") : 
                   "GPS Tidak Aktif"}
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
            className={`w-full h-14 text-lg transition-all ${
                isInsideLahan 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-slate-400 cursor-not-allowed grayscale"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            ) : (
              <TreePine className="w-6 h-6 mr-2" />
            )}
            {isInsideLahan ? "Tag Tanaman di Lokasi Ini" : "Lokasi di Luar Lahan"}
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
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            
            {currentLocation && (
              <MapController center={currentLocation} />
            )}

            {/* Land polygon */}
            {polygonPositions.length >= 3 && (
              <Polygon 
                positions={polygonPositions} 
                pathOptions={{ 
                  color: isInsideLahan ? "#16a34a" : "#ef4444", 
                  fillColor: isInsideLahan ? "#16a34a" : "#ef4444", 
                  fillOpacity: isInsideLahan ? 0.15 : 0.3,
                  weight: 2,
                  dashArray: isInsideLahan ? "5, 5" : "0"
                }} 
              />
            )}

            {currentLocation && (
              <Circle
                center={currentLocation}
                radius={gpsAccuracy} // Lingkaran ini akan mengecil seiring GPS semakin akurat
                pathOptions={{ 
                  fillColor: isInsideLahan ? '#3b82f6' : '#ef4444', 
                  color: 'transparent',
                  fillOpacity: 0.2 
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
              {!isInsideLahan ? (
                <span className="font-semibold text-red-600">Peringatan: Posisi Anda di luar batas hijau. Masuk ke area lahan untuk menandai.</span>
              ) : (
                <>
                  <span className="font-semibold">Petunjuk:</span> Berdiri di dekat tanaman, lalu tekan tombol 
                  <span className="font-semibold text-emerald-600"> "Tag Tanaman"</span> untuk menandai posisi.
                </>
              )}
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