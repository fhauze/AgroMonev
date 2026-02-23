import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, TreePine, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const validationColors = {
  valid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  invalid: "bg-rose-100 text-rose-700 border-rose-200",
  need_review: "bg-amber-100 text-amber-700 border-amber-200",
  pending: "bg-slate-100 text-slate-600 border-slate-200"
};

const validationLabels = {
  valid: "Tervalidasi",
  invalid: "Tidak Valid",
  need_review: "Perlu Review",
  pending: "Menunggu"
};

const statusColors = {
  owned: "Milik Sendiri",
  rented: "Sewa",
  shared: "Bagi Hasil",
  government: "Tanah Negara"
};

export default function LandCard({ land, farmerName, plantCount = 0 }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all p-5 bg-white group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">{land.name}</h3>
          {farmerName && <p className="text-sm text-slate-500">{farmerName}</p>}
        </div>
        <Badge className={`${validationColors[land.validation_status]} border font-medium text-xs`}>
          {validationLabels[land.validation_status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Luas Lahan</span>
          </div>
          <p className="font-semibold text-slate-900">
            {land.area_hectares ? `${land.area_hectares.toFixed(2)} Ha` : "-"}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <TreePine className="w-3.5 h-3.5" />
            <span>Jumlah Pohon</span>
          </div>
          <p className="font-semibold text-slate-900">{plantCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{land.village}, {land.district}</span>
        </div>
        <Link to={createPageUrl("LandDetail") + `?id=${land.id}`}>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600">
            Detail
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {land.land_status && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">Status: {statusColors[land.land_status]}</span>
        </div>
      )}
    </Card>
  );
}