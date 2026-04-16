import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMap, Circle } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, Navigation, RotateCcw, Zap, ZapOff, Map as MapIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Geolocation } from '@capacitor/geolocation';

// Konfigurasi Icon Marker agar muncul di Android
const customMarkerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const getColorByIndex = (index) => {
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
  return colors[index % colors.length];
};
// Komponen Pengatur Peta (PENTING: Memperbaiki masalah layar putih)
function MapController({ center, isTracking }) {
  const map = useMap();
  
  useEffect(() => {
    // Memaksa Leaflet menghitung ulang ukuran container setelah render pertama
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);

  useEffect(() => {
    if (center && isTracking) {
      map.setView(center, 19, { animate: true });
    }
  }, [center, isTracking, map]);

  return null;
}

export default function GPSLandMapper({ onSave, readOnly = false }) {
  const [points, setPoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [positionBuffer, setPositionBuffer] = useState([]);

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

  // Hitung Luas
  const area = useMemo(() => {
    if (points.length < 3) return 0;
    const radius = 6378137;
    let areaVal = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const lat1 = p1[0] * Math.PI / 180;
      const lon1 = p1[1] * Math.PI / 180;
      const lat2 = p2[0] * Math.PI / 180;
      const lon2 = p2[1] * Math.PI / 180;
      areaVal += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs(areaVal * radius * radius / 2.0) / 10000;
  }, [points]);

  const startGPSTracking = async () => {
    try {
      const permissions = await Geolocation.requestPermissions();
      if (permissions.location !== 'granted') {
        toast.error("Izin lokasi diperlukan");
        return;
      }

      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (position, err) => {
          if (err) return;
          if (position) {
            const coords = [position.coords.latitude, position.coords.longitude];
            setCurrentLocation(coords);
            setGpsAccuracy(position.coords.accuracy);
            setPositionBuffer(prev => [...prev, coords].slice(-5));
          }
        }
      );
      setWatchId(id);
    } catch (e) {
      toast.error("GPS Error: " + e.message);
    }
  };

  const stopGPSTracking = async () => {
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      setWatchId(null);
    }
  };

  useEffect(() => {
    if (isTracking) startGPSTracking();
    else stopGPSTracking();
    return () => stopGPSTracking();
  }, [isTracking]);

  const addPoint = () => {
    if (!currentLocation) return;
    if (gpsAccuracy > 15) {
      toast.error("Akurasi terlalu rendah, tunggu sinyal stabil");
      return;
    }
    // Averaging
    const lat = positionBuffer.reduce((a, b) => a + b[0], 0) / positionBuffer.length;
    const lng = positionBuffer.reduce((a, b) => a + b[1], 0) / positionBuffer.length;
    setPoints([...points, [lat, lng]]);
    toast.success("Titik sudut ditambahkan");
  };

  return (
    <Card className="w-full border-0 shadow-none bg-background flex flex-col h-[92vh]">
      
      {/* SECTION 1: KONTROL UTAMA (Selalu Ada) */}
      <div className="p-4 space-y-3 bg-white z-[2000]">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              {isTracking ? `Akurasi: ±${gpsAccuracy?.toFixed(1)}m` : "GPS Nonaktif"}
            </span>
          </div>
          {currentLocation && <Badge variant="outline" className="text-[10px] opacity-70">Sinyal Terkunci</Badge>}
        </div>

        <div className="flex gap-2">
          {!isTracking ? (
            <Button onClick={() => setIsTracking(true)} className="flex-1 h-12 bg-blue-600 shadow-sm font-bold">
              <Zap className="mr-2 h-4 w-4" /> Mulai Ukur Lahan
            </Button>
          ) : (
            <>
              <Button onClick={addPoint} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold">
                <Navigation className="mr-2 h-4 w-4" /> Tandai Sudut ({points.length})
              </Button>
              <Button variant="outline" onClick={() => setIsTracking(false)} className="h-12 w-12 border-red-200 text-red-500 hover:bg-red-50">
                <ZapOff className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2: AREA INFORMASI LUAS & SIMPAN (Muncul jika titik >= 3) */}
      {points.length >= 3 && (
        <div className="mx-4 mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 z-[2000]">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Estimasi Luas</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-900">{area.toFixed(4)}</span>
              <span className="text-sm font-bold text-emerald-700">Ha</span>
            </div>
          </div>
          
          {!readOnly && (
            <Button 
              onClick={() => onSave({ points, area })} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg px-6 h-11 rounded-xl font-bold"
            >
              <Save className="w-4 h-4 mr-2" /> Simpan
            </Button>
          )}
        </div>
      )}

      {/* SECTION 3: MAP CONTAINER */}
      <div className="flex-1 relative w-full overflow-hidden bg-slate-100 border-t">
        <MapContainer
          center={[-6.2, 106.8]}
          zoom={15}
          zoomControl={false}
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Esri World Imagery"
          />
          <MapController center={currentLocation} isTracking={isTracking} />

          {currentLocation && isTracking && (
            <Marker position={currentLocation} icon={customMarkerIcon} />
          )}

          {points.map((p, i) => (
            <Marker 
              key={i} 
              position={p} 
              icon={L.divIcon({
                className: '',
                html: `<div style="background:${getColorByIndex(i)}; width:24px; height:24px; border-radius:50%; border:2px solid white; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; shadow-md">${i+1}</div>`
              })} 
            />
          ))}
          
          {points.length >= 3 && (
            <Polygon positions={points} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3, weight: 3 }} />
          )}
        </MapContainer>

        {/* Floating Reset Button (Hanya ini yang di dalam peta) */}
        {points.length > 0 && (
          <div className="absolute bottom-6 left-4 right-4 flex gap-2 z-[1000]">
            <Button 
              variant="secondary" 
              className="flex-1 bg-white/90 backdrop-blur shadow-md" 
              onClick={() => setPoints(points.slice(0, -1))}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Batal
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1 shadow-md" 
              onClick={() => setPoints([])}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}