import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMap } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Locate, MapPin, Trash2, Save, Navigation, RotateCcw } from "lucide-react";
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

// const cornerLabels = ["A", "B", "C", "D"];
// const cornerColors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
const getColorByIndex = (index) => {
  const colors = [
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6"
  ];
  return colors[index % colors.length];
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 18);
    }
  }, [center, map, zoom]);
  return null;
}

function calculatePolygonArea(points) {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;
  
  // Convert to hectares
  const latMid = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);
  const areaInMeters = area * metersPerDegLat * metersPerDegLng;
  
  return areaInMeters / 10000;
}

export default function GPSLandMapper({ existingPolygon, onSave, readOnly = false }) {
  const [points, setPoints] = useState(existingPolygon || []);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [watchId, setWatchId] = useState(null);

  const area = calculatePolygonArea(points);

  const getDistance = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const R = 6371000; // Radius bumi dalam meter
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (existingPolygon && existingPolygon.length > 0) {
      const converted = existingPolygon.map((p) => [p[1], p[0]]);
      setPoints(converted);
    } else {
      setPoints([]);
    }
  }, [existingPolygon]);

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

  // Add current location as a corner point
  // const addCornerPoint = () => {
  //   if (!currentLocation) {
  //     toast.error("Tunggu GPS menemukan lokasi Anda");
  //     return;
  //   }
    
  //   if (points.length >= 4) {
  //     toast.error("Maksimal 4 titik sudut (A, B, C, D)");
  //     return;
  //   }

  //   const newPoints = [...points, currentLocation];
  //   setPoints(newPoints);
  //   toast.success(`Titik ${cornerLabels[points.length]} ditandai!`);
  // };

  // const addCornerPoint = () => {
  //   if (!currentLocation) {
  //     toast.error("Tunggu GPS menemukan lokasi Anda");
  //     return;
  //   }

  //   const newPoints = [...points, currentLocation];
  //   setPoints(newPoints);

  //   toast.success(`Titik ${newPoints.length} ditandai!`);
  // };

  const addCornerPoint = () => {
    if (!currentLocation) {
      toast.error("Tunggu GPS menemukan lokasi Anda");
      return;
    }

    // Validasi Akurasi: Jangan izinkan jika akurasi GPS terlalu buruk (> 15 meter)
    // untuk menghindari titik "melompat" jauh.
    if (gpsAccuracy > 15) {
      toast.warning(`Akurasi GPS rendah (±${gpsAccuracy.toFixed(0)}m). Tunggu sebentar.`);
    }

    // Validasi Jarak: Pastikan titik baru tidak menumpuk di koordinat yang sama persis
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const dist = getDistance(lastPoint, currentLocation);
      
      if (dist < 0.5) { // Jika jarak < 50cm, anggap user belum bergerak
        toast.error("Posisi terlalu dekat dengan titik sebelumnya");
        return;
      }
    }

    const newPoints = [...points, currentLocation];
    setPoints(newPoints);
    toast.success(`Titik ${newPoints.length} ditandai!`);
  };

  // Remove last point
  const removeLastPoint = () => {
    if (points.length > 0) {
      const newPoints = points.slice(0, -1);
      setPoints(newPoints);
      toast.info("Titik terakhir dihapus");
    }
  };

  // Clear all points
  const clearAllPoints = () => {
    setPoints([]);
    toast.info("Semua titik dihapus");
  };

  // Save polygon
  const handleSave = () => {
    if (points.length < 3) {
      toast.error("Minimal 3 titik untuk membentuk lahan");
      return;
    }

    const centerLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const centerLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    
    onSave({
      polygon_coordinates: points.map(p => [p[1], p[0]]), // [lng, lat] for storage
      center_lat: centerLat,
      center_lng: centerLng,
      area_hectares: area
    });
  };

  // Create custom marker icons for corners
  // const createCornerIcon = (index) => {
  //   return new L.DivIcon({
  //     className: "custom-corner-icon",
  //     html: `<div style="
  //       width: 32px; 
  //       height: 32px; 
  //       background: ${cornerColors[index]}; 
  //       border-radius: 50%; 
  //       border: 3px solid white; 
  //       box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  //       display: flex;
  //       align-items: center;
  //       justify-content: center;
  //       color: white;
  //       font-weight: bold;
  //       font-size: 14px;
  //     ">${cornerLabels[index]}</div>`,
  //     iconSize: [32, 32],
  //     iconAnchor: [16, 16]
  //   });
  // };

  const createCornerIcon = (index) => {
  return new L.DivIcon({
    className: "custom-corner-icon",
    html: `<div style="
      width: 32px; 
      height: 32px; 
      background: ${getColorByIndex(index)}; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

  const currentLocationIcon = new L.DivIcon({
    className: "current-location-icon",
    html: `<div style="
      width: 20px; 
      height: 20px; 
      background: #3b82f6; 
      border-radius: 50%; 
      border: 4px solid white; 
      box-shadow: 0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.4); }
        50% { box-shadow: 0 0 0 2px #3b82f6, 0 0 0 12px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.4); }
      }
    </style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {/* GPS Status & Controls */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-4">
        {/* GPS Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <div className={`w-3 h-3 rounded-full ${currentLocation ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} /> */}
            <div className={`w-3 h-3 rounded-full ${
              gpsAccuracy <= 5 ? "bg-emerald-500" : 
              gpsAccuracy <= 10 ? "bg-amber-500" : "bg-red-500"
            } animate-pulse`} />
            <div>
              <p className="text-sm font-medium text-slate-700">
                {isLocating ? "Mencari lokasi GPS..." : currentLocation ? "GPS Aktif" : "GPS Tidak Aktif"}
              </p>
              <p className={`text-xs font-semibold ${gpsAccuracy > 10 ? "text-red-500" : "text-slate-500"}`}>
                Akurasi: ±{gpsAccuracy?.toFixed(1)} meter 
                {gpsAccuracy > 10 && " (Kurang Akurat)"}
              </p>
            </div>
          </div>
          {currentLocation && (
            <Badge variant="outline" className="text-xs">
              {currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}
            </Badge>
          )}
        </div>

        {/* Corner Points Status 
        <div className="flex items-center gap-2 flex-wrap">
          {cornerLabels.map((label, idx) => (
            <div 
              key={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                points[idx] 
                  ? "bg-white border-2 shadow-sm" 
                  : "bg-slate-200 text-slate-400 border-2 border-transparent"
              }`}
              style={{ borderColor: points[idx] ? cornerColors[idx] : "transparent" }}
            >
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: points[idx] ? cornerColors[idx] : "#94a3b8" }}
              >
                {label}
              </div>
              <span style={{ color: points[idx] ? cornerColors[idx] : "#94a3b8" }}>
                {points[idx] ? "✓" : "?"}
              </span>
            </div>
          ))}
        </div>*/}
        <div className="flex flex-wrap gap-2">
          {points.map((_, idx) => (
            <div
              key={idx}
              className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: getColorByIndex(idx) }}
            >
              Titik {idx + 1}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={addCornerPoint}
              disabled={!currentLocation || points.length >= 4}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
            >
              <Navigation className="w-5 h-5 mr-2" />
              Tandai Titik {/** cornerLabels[points.length] || "" */} 
              {points.length + 1}
            </Button>
            <Button
              variant="outline"
              onClick={removeLastPoint}
              disabled={points.length === 0}
              className="h-12"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              onClick={clearAllPoints}
              disabled={points.length === 0}
              className="h-12"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Area Display */}
        {points.length >= 3 && (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Luas Lahan Terhitung</p>
                <p className="text-3xl font-bold text-emerald-700">{area.toFixed(4)} Ha</p>
                <p className="text-xs text-emerald-500 mt-1">{(area * 10000).toFixed(0)} m²</p>
              </div>
              {!readOnly && (
                <Button 
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Simpan Lahan
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-[400px] relative">
        <MapContainer 
          center={currentLocation || [-6.2, 106.8]} 
          zoom={18} 
          className="h-full w-full z-0"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {currentLocation && (
            <MapController center={currentLocation} zoom={18} />
          )}

          {/* Current location marker */}
          {currentLocation && (
            <Marker position={currentLocation} icon={currentLocationIcon} />
          )}

          {/* Corner markers */}
          {points.map((point, idx) => (
            <Marker 
              key={idx} 
              position={point} 
              icon={createCornerIcon(idx)}
            />
          ))}

          {/* Polygon */}
          {points.length >= 3 && (
            <Polygon 
              positions={points} 
              pathOptions={{ 
                color: "#16a34a", 
                fillColor: "#16a34a", 
                fillOpacity: 0.3,
                weight: 3
              }} 
            />
          )}
        </MapContainer>

        {/* Instructions overlay */}
        {!readOnly && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg z-[1000]">
            {/**<p className="text-sm text-slate-700">
              <span className="font-semibold">Petunjuk:</span> Berdiri di sudut lahan, lalu tekan tombol 
               <span className="font-semibold text-emerald-600"> 
               "Tandai Titik {cornerLabels[points.length]}"</span> untuk menandai posisi.
              {points.length === 0 && " Mulai dari sudut pertama (A)."}
              {points.length > 0 && points.length < 3 && ` Lanjutkan ke titik ${cornerLabels[points.length]}.`}
              {points.length >= 3 && " Anda bisa simpan atau tambah titik D."} 
              
            </p> */}
            <p className="text-sm text-slate-700">
                <span className="font-semibold">Petunjuk:</span> 
                Berdiri di setiap sudut lahan lalu tekan 
                <span className="font-semibold text-emerald-600">
                  {" "}Tandai Titik {points.length + 1}
                </span>.
                {points.length < 3 && " Minimal 3 titik untuk membentuk polygon."}
                {points.length >= 3 && " Anda dapat menambahkan titik tambahan mengikuti bentuk lahan."}
              </p>
            
          </div>
        )}
      </div>
    </Card>
  );
}