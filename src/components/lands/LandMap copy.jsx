import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Locate, Trash2, Save } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ onLocationFound }) {
  const map = useMap();
  
  useEffect(() => {
    map.locate();
    map.on("locationfound", (e) => {
      map.flyTo(e.latlng, 16);
      if (onLocationFound) onLocationFound(e.latlng);
    });
  }, [map, onLocationFound]);

  return null;
}

function DrawPolygon({ points, setPoints, isDrawing }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    }
  });

  return points.length > 0 ? (
    <>
      <Polygon 
        positions={points} 
        pathOptions={{ 
          color: "#16a34a", 
          fillColor: "#16a34a", 
          fillOpacity: 0.3,
          weight: 2
        }} 
      />
      {points.map((point, idx) => (
        <Marker key={idx} position={point}>
          <Popup>Titik {idx + 1}</Popup>
        </Marker>
      ))}
    </>
  ) : null;
}

function calculateArea(points) {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;
  
  // Convert to hectares (rough approximation)
  const latMid = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);
  const areaInMeters = area * metersPerDegLat * metersPerDegLng;
  
  return areaInMeters / 10000; // Convert to hectares
}

export default function LandMap({ 
  center = [-6.2, 106.8], 
  zoom = 13, 
  existingPolygon = null,
  onSave,
  readOnly = false,
  lands = [],
  plants = []
}) {
  const [points, setPoints] = useState(existingPolygon || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const area = calculateArea(points);

  const handleClear = () => {
    setPoints([]);
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (points.length >= 3 && onSave) {
      const centerLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
      const centerLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
      onSave({
        polygon_coordinates: points.map(p => [p[1], p[0]]), // Convert to [lng, lat]
        center_lat: centerLat,
        center_lng: centerLng,
        area_hectares: area
      });
    }
  };

  const plantIcon = new L.DivIcon({
    className: "custom-plant-icon",
    html: `<div style="width: 24px; height: 24px; background: #16a34a; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {!readOnly && (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <Button
              variant={isDrawing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsDrawing(!isDrawing)}
              className={isDrawing ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {isDrawing ? "Sedang Menggambar..." : "Mulai Gambar Polygon"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {area > 0 && (
              <span className="text-sm font-medium text-slate-600">
                Luas: <span className="text-emerald-600">{area.toFixed(4)} Ha</span>
              </span>
            )}
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={points.length < 3}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan Polygon
            </Button>
          </div>
        </div>
      )}
      
      <div className="h-[500px] relative">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          className="h-full w-full z-0"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationFound={setUserLocation} />
          
          {!readOnly && (
            <DrawPolygon points={points} setPoints={setPoints} isDrawing={isDrawing} />
          )}

          {/* Existing lands */}
          {lands.map(land => land.polygon_coordinates && (
            <Polygon
              key={land.id}
              positions={land.polygon_coordinates.map(c => [c[1], c[0]])}
              pathOptions={{ 
                color: land.validation_status === "valid" ? "#16a34a" : "#f59e0b",
                fillColor: land.validation_status === "valid" ? "#16a34a" : "#f59e0b",
                fillOpacity: 0.2,
                weight: 2
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{land.name}</p>
                  <p className="text-slate-500">{land.area_hectares?.toFixed(2)} Ha</p>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Plants */}
          {plants.map(plant => (
            <Marker 
              key={plant.id} 
              position={[plant.latitude, plant.longitude]}
              icon={plantIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{plant.commodity_name}</p>
                  <p className="text-slate-500">Status: {plant.status}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {userLocation && (
            <Marker position={userLocation}>
              <Popup>Lokasi Anda</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </Card>
  );
}