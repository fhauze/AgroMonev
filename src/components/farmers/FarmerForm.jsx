import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Phone, Users, Loader2 } from "lucide-react";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";

// const provinces = [
//   "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Sumatera Utara", "Sumatera Selatan",
//   "Kalimantan Barat", "Kalimantan Timur", "Sulawesi Selatan", "Bali", "NTB"
// ];

export default function FarmerForm({ initialData, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    nik: "",
    full_name: "",
    phone: "",
    farmer_group: "",
    village: "",
    district: "",
    regency: "",
    province: "",
    verification_status: "pending",
    sync_status: "pending"
  });

  const { data: rawProvinces } = useQuery({
    queryKey: ['provinces'],
    queryFn: async() => {
      const resp = await entity("Province").list()
      return resp ?? []
    },
  });

  // const {data: provinces = []} = useQuery({
  //   queryKey: ['provinces'],
  //   queryFn: () => base44.entities.Province.list(),
  //   onSuccess: (data) => {
  //     if (Array.isArray(data) && data.length > 0) {
  //       setFormData(prev => ({ ...prev, province: data[0].name }));
  //     } else {
  //       console.warn("Data provinsi kosong atau offline");
  //       // Opsional: set default value jika offline
  //       // setFormData(prev => ({ ...prev, province: "Jawa Barat" }));
  //     }
  //   }
  // })

  const provinces = Array.isArray(rawProvinces) 
  ? rawProvinces 
  : (rawProvinces?.data && Array.isArray(rawProvinces.data)) 
    ? rawProvinces.data 
    : [];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  useEffect(() => {
    if (Array.isArray(provinces) && provinces.length > 0) {
      setFormData(prev => ({ ...prev, province: provinces[0].name }));
    }
  }, [provinces]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            Data Identitas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nik">NIK (Nomor Induk Kependudukan)</Label>
              <Input
                id="nik"
                value={formData.nik}
                onChange={(e) => handleChange("nik", e.target.value)}
                placeholder="16 digit NIK"
                maxLength={16}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Nama sesuai KTP"
                required
                className="h-11"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmer_group">Kelompok Tani</Label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="farmer_group"
                  value={formData.farmer_group}
                  onChange={(e) => handleChange("farmer_group", e.target.value)}
                  placeholder="Nama kelompok tani"
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Alamat Domisili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="province">Provinsi</Label>
              <Select value={formData.province} onValueChange={(v) => handleChange("province", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih provinsi" />
                </SelectTrigger>
                <SelectContent>
                {provinces.length > 0 ? (
                  provinces.map((p, idx) => (
                    <SelectItem key={p.id || idx} value={p.nama || p.name}>
                      {p.nama || p.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Data tidak tersedia</SelectItem>
                )}
              </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regency">Kabupaten/Kota</Label>
              <Input
                id="regency"
                value={formData.regency}
                onChange={(e) => handleChange("regency", e.target.value)}
                placeholder="Nama kabupaten/kota"
                required
                className="h-11"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district">Kecamatan</Label>
              <Input
                id="district"
                value={formData.district}
                onChange={(e) => handleChange("district", e.target.value)}
                placeholder="Nama kecamatan"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="village">Desa/Kelurahan</Label>
              <Input
                id="village"
                value={formData.village}
                onChange={(e) => handleChange("village", e.target.value)}
                placeholder="Nama desa/kelurahan"
                required
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialData ? "Simpan Perubahan" : "Daftarkan Petani"}
        </Button>
      </div>
    </form>
  );
}