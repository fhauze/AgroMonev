import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Users, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200"
};

const statusLabels = {
  pending: "W",
  verified: "V",
  rejected: "X"
};

export default function FarmerCard({ farmer }) {
  console.log("Petani : ", farmer);
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all p-5 bg-white group">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
          {farmer.photo_url ? (
            <img src={farmer.photo_url} alt={farmer?.name || farmer?.nama || '-'} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-emerald-700">
              {farmer.full_name?.charAt(0)?.toUpperCase() || "P"}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-slate-900 truncate">{farmer?.full_name || farmer?.name || farmer?.nama }</h3>
              <p className="text-sm text-slate-500">NIK: {farmer?.kk}</p>
            </div>
            <Badge className={`${statusColors[farmer.user.email_verified_at !== null || farmer.user.email_verified_at !== undefined ? 'verified' : 'pending']} border font-medium text-xs`}>
              {statusLabels[farmer.user.email_verified_at !== null || farmer.user.email_verified_at !== undefined ? 'verified' : 'pending']}
            </Badge>
          </div>
          
          <div className="space-y-1.5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="truncate">{farmer.alamat}</span>
            </div>
            {farmer.farmer_group && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="truncate">{farmer.farmer_group}</span>
              </div>
            )}
            {farmer.telepon && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{farmer?.telepon}</span>
              </div>
            )}
          </div>
        </div>

        <Link to={createPageUrl("FarmerDetail") + `?id=${farmer.id}`}>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}