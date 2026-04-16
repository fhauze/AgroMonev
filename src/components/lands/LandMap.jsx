import { Fragment, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Save } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* ================================
   FIX DEFAULT MARKER ICON
================================ */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/* ================================
   HELPER HURUF A,B,C,D...
================================ */
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const commodityColors = {
  "Kopi Arabika": "#7c3aed",   // ungu
  "Kakao": "#b45309",          // coklat
  "Kelapa Sawit": "#15803d",   // hijau tua
  "Padi": "#facc15",           // kuning
  "Jagung": "#f97316",         // oranye
};

const getLabel = (i) => {
  return i < 26
    ? alphabet[i]
    : alphabet[Math.floor(i / 26) - 1] + alphabet[i % 26];
};
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkPlantSpacing(plants, minDistance = 10) {
  const violations = new Set();

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const distance = getDistanceInMeters(
        plants[i].latitude,
        plants[i].longitude,
        plants[j].latitude,
        plants[j].longitude
      );

      if (distance < minDistance) {
        violations.add(plants[i].id);
        violations.add(plants[j].id);
      }
    }
  }

  return violations;
}

const createCornerIcon = (letter) =>
  new L.DivIcon({
    className: "",
    html: `
      <div style="
        width:28px;
        height:28px;
        background:#15803d;
        color:white;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:bold;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      ">
        ${letter}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });


/* ================================
   ICON TANAMAN BERDASARKAN STATUS
================================ */
const createPlantIcon = (commodity, status) => {
  const baseColor =
    commodityColors[commodity] || "#16a34a";

  const borderColor =
    status === "alive"
      ? "#ffffff"
      : status === "sick"
      ? "#f59e0b"
      : "#64748b";

  const opacity =
    status === "dead" ? 0.5 : 1;

  return new L.DivIcon({
    className: "",
    html: `
      <div style="
        width:22px;
        height:22px;
        background:${baseColor};
        border-radius:50%;
        border:3px solid ${borderColor};
        opacity:${opacity};
        box-shadow:0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};


/* ================================
   LOCATION MARKER
================================ */
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

/* ================================
   DRAW POLYGON MODE
================================ */
function DrawPolygon({ points, setPoints, isDrawing }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    },
  });

  return points.length > 0 ? (
    <>
      <Polygon
        positions={points}
        pathOptions={{
          color: "#16a34a",
          fillColor: "#16a34a",
          fillOpacity: 0.3,
          weight: 2,
        }}
      />
      {points.map((point, idx) => (
        <Marker key={idx} position={point}>
          <Popup>Titik {getLabel(idx)}</Popup>
        </Marker>
      ))}
    </>
  ) : null;
}

/* ================================
   HITUNG LUAS POLYGON (HEKTAR)
================================ */
function calculateArea(points) {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;

  const latMid =
    points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng =
    111320 * Math.cos((latMid * Math.PI) / 180);

  const areaInMeters =
    area * metersPerDegLat * metersPerDegLng;

  return areaInMeters / 10000;
}

/* ================================
   MAIN COMPONENT
================================ */
export default function LandMap({
  center = [-6.2, 106.8],
  zoom = 20,
  existingPolygon = null,
  onSave,
  readOnly = false,
  lands = [],
  plants = [],
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
      const centerLat =
        points.reduce((sum, p) => sum + p[0], 0) /
        points.length;
      const centerLng =
        points.reduce((sum, p) => sum + p[1], 0) /
        points.length;

      onSave({
        polygon_coordinates: points.map((p) => [p[1], p[0]]),
        center_lat: centerLat,
        center_lng: centerLng,
        area_hectares: area,
      });
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {!readOnly && (
        <div className="p-4 border-b flex justify-between bg-slate-50">
          <div className="flex gap-2">
            <Button
              variant={isDrawing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsDrawing(!isDrawing)}
            >
              {isDrawing
                ? "Sedang Menggambar..."
                : "Mulai Gambar Polygon"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex gap-3 items-center">
            {area > 0 && (
              <span className="text-sm">
                Luas:{" "}
                <b className="text-emerald-600">
                  {area.toFixed(4)} Ha
                </b>
              </span>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={points.length < 3}
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        </div>
      )}

      <div className="h-[500px]">
        <MapContainer
          center={center}
          zoom={zoom}
          maxZoom={22}
          maxNativeZoom={19}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            maxZoom={22}
            maxNativeZoom={19}/>

          <LocationMarker
            onLocationFound={setUserLocation}
          />

          {!readOnly && (
            <DrawPolygon
              points={points}
              setPoints={setPoints}
              isDrawing={isDrawing}
            />
          )}

          {/* Existing Lands */}
          {lands.map((land) => {
            if (!land.path) return null;

            let pathArray;
            try{
              pathArray = typeof land.path === 'string' ? JSON.parse(land.path) : land.path
            }catch (e) {
              console.error("Format path tidak valid untuk lahan:", land.id);
              return null;
            }
            if (!Array.isArray(pathArray) || pathArray.length === 0) return null;

            const cleaned =
              pathArray.length > 1 &&
              pathArray[0][0] === pathArray[pathArray.length - 1][0] &&
              pathArray[0][1] === pathArray[pathArray.length - 1][1]
                ? pathArray.slice(0, -1)
                : pathArray;

            const polygonLatLng = cleaned.map((c) => [
              c[1],
              c[0],
            ]);

            return (
              <Fragment key={`land-group-${land.id}`}>
                <Polygon
                  key={land.id}
                  positions={polygonLatLng}
                  pathOptions={{
                    color:
                      land.validation_status === "valid"
                        ? "#16a34a"
                        : "#f59e0b",
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div>
                      <b>{land.name}</b>
                      <br />
                      {land.area_hectares?.toFixed(2)} Ha
                    </div>
                  </Popup>
                </Polygon>

                {polygonLatLng.map((point, i) => (
                  <Marker
                    key={`${land.id}-${i}`}
                    position={point}
                    icon={createCornerIcon(getLabel(i))}
                  />
                ))}
              </Fragment>
            );
          })}

          {/* Plants */}
          {plants.map((plant) => (
            <Marker
              key={plant.id}
              position={[
                plant.latitude,
                plant.longitude,
              ]}
              icon={createPlantIcon(plant.status)}
            >
              <Popup>
                <b>{plant.commodity_name}</b>
                <br />
                Status: {plant.status}
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
