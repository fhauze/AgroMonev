import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMap, Circle } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Locate, MapPin, Trash2, Save, Navigation, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const getColorByIndex = (index) => {
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
  return colors[index % colors.length];
};

/**
 * Kalkulasi Luas Lahan (Hektar) yang lebih presisi
 */
function calculatePolygonArea(points) {
  if (points.length < 3) return 0;
  
  const radius = 6378137; // Radius Bumi (meters)
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    // Konversi ke Radians
    const lat1 = p1[0] * Math.PI / 180;
    const lon1 = p1[1] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const lon2 = p2[1] * Math.PI / 180;

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * radius * radius / 2.0);
  return area / 10000; // Return in Hectares
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Zoom 20 untuk melihat detail batas lahan lebih dekat
      map.flyTo(center, zoom || 20, { duration: 1.5 });
    }
  }, [center, map, zoom]);
  return null;
}

export default function GPSLandMapper({ existingPolygon, onSave, readOnly = false }) {
  const [points, setPoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [watchId, setWatchId] = useState(null);

  const area = useMemo(() => calculatePolygonArea(points), [points]);

  const getDistance = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const R = 6371000;
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (existingPolygon && existingPolygon.length > 0) {
      // Pastikan format dari database [lng, lat] dibalik ke [lat, lng] untuk Leaflet
      const converted = Array.isArray(existingPolygon[0]) 
        ? existingPolygon.map(p => [p[1], p[0]]) 
        : [];
      setPoints(converted);
    }
  }, [existingPolygon]);

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      toast.error("GPS tidak didukung");
      return;
    }
    setIsLocating(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
        setGpsAccuracy(pos.coords.accuracy);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        toast.error("Gagal mendapatkan lokasi GPS");
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    setWatchId(id);
  };

  const stopGPSTracking = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  };

  useEffect(() => {
    startGPSTracking();
    return () => stopGPSTracking();
  }, []);

  const addCornerPoint = () => {
    if (!currentLocation) {
      toast.error("Tunggu GPS mengunci lokasi");
      return;
    }
    
    if (gpsAccuracy > 10) {
      toast.error(`Akurasi buruk (±${gpsAccuracy.toFixed(0)}m). Pindah ke tempat terbuka.`);
      return;
    }

    if (points.length > 0) {
      const dist = getDistance(points[points.length - 1], currentLocation);
      if (dist < 1) { 
        toast.error("Anda belum bergerak dari titik terakhir");
        return;
      }
    }

    setPoints([...points, currentLocation]);
    toast.success(`Titik ${points.length + 1} ditandai`);
  };

  const removeLastPoint = () => setPoints(points.slice(0, -1));
  const clearAllPoints = () => setPoints([]);

  const handleSave = () => {
    if (points.length < 3) {
      toast.error("Minimal harus ada 3 titik");
      return;
    }
    onSave({
      polygon_coordinates: points.map(p => [p[1], p[0]]), // [lng, lat]
      center_lat: points.reduce((s, p) => s + p[0], 0) / points.length,
      center_lng: points.reduce((s, p) => s + p[1], 0) / points.length,
      area_hectares: area
    });
  };

  const createCornerIcon = (index) => L.divIcon({
    className: "custom-corner-icon",
    html: `<div style="width:32px;height:32px;background:${getColorByIndex(index)};border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${index + 1}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16]
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${gpsAccuracy <= 5 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
            <div>
              <p className="text-sm font-medium">GPS {currentLocation ? "Aktif" : "Mencari..."}</p>
              <p className={`text-xs font-bold ${gpsAccuracy > 10 ? 'text-red-500' : 'text-slate-500'}`}>
                Akurasi: ±{gpsAccuracy?.toFixed(1)}m {gpsAccuracy > 10 && "(Lemah)"}
              </p>
            </div>
          </div>
          {currentLocation && <Badge variant="outline">{currentLocation[0].toFixed(5)}, {currentLocation[1].toFixed(5)}</Badge>}
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            <Button onClick={addCornerPoint} disabled={!currentLocation} className="flex-1 bg-emerald-600 h-12">
              <Navigation className="w-5 h-5 mr-2" /> Tandai Titik {points.length + 1}
            </Button>
            <Button variant="outline" onClick={removeLastPoint} disabled={points.length === 0} className="h-12"><RotateCcw /></Button>
            <Button variant="outline" onClick={clearAllPoints} disabled={points.length === 0} className="h-12"><Trash2 /></Button>
          </div>
        )}

        {points.length >= 3 && (
          <div className="p-4 bg-emerald-600 text-white rounded-xl flex justify-between items-center">
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider">Estimasi Luas</p>
              <p className="text-2xl font-bold">{area.toFixed(4)} Ha</p>
            </div>
            {!readOnly && <Button onClick={handleSave} className="bg-white text-emerald-700 hover:bg-emerald-50"><Save className="mr-2 h-4 w-4"/> Simpan</Button>}
          </div>
        )}
      </div>

      <div className="h-[450px] relative">
        <MapContainer center={currentLocation || [-6.2, 106.8]} zoom={18} className="h-full w-full">
          {/* LAYER SATELIT UNTUK PRESISI */}
          <TileLayer
            attribution='&copy; Esri World Imagery'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          
          <MapController center={currentLocation} />

          {currentLocation && (
            <>
              <Circle 
                center={currentLocation} 
                radius={gpsAccuracy} 
                pathOptions={{ color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.2 }} 
              />
              <Marker position={currentLocation} icon={L.divIcon({
                className: "loc-icon",
                html: `<div style="width:20px;height:20px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>`,
                iconSize:[20,20], iconAnchor:[10,10]
              })} />
            </>
          )}

          {points.map((p, i) => <Marker key={i} position={p} icon={createCornerIcon(i)} />)}
          {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.3, weight: 3 }} />}
        </MapContainer>

        {!readOnly && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md z-[1000] border-l-4 border-emerald-500">
            <p className="text-xs text-slate-600">
              <span className="font-bold">Tips:</span> Berjalanlah ke setiap sudut lahan. Tunggu lingkaran biru mengecil sebelum menekan "Tandai Titik" untuk hasil yang lebih presisi.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}