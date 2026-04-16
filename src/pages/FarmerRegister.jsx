import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import  base44  from "@/api/Client";
import { entity } from "@/api/entities";
import { createPageUrl } from "@/utils";
import FarmerForm from "@/components/farmers/FarmerForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
// Import Offline Service yang baru kita buat
import { OfflineService } from "@/components/common/offlineStorage";

export default function FarmerRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log("1. Memulai proses simpan...", data);
      try {
        // return await base44.entities.Farmer.create(data);
        const response = await entity('map', 'lahan').create(data);
        if (typeof response === 'string' && response.includes('<!doctype html>')) {
          throw new Error("Menerima HTML, bukan JSON. Endpoint mungkin salah.");
        }
        console.log("2. Berhasil simpan ke server", response);
        return response;
      } catch (error) {
        console.log("2. Gagal ke server, beralih ke offline mode", error);
        throw { type: 'OFFLINE_SAVE', data };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["farmers"] });
      toast.success("Petani berhasil didaftarkan ke server!");
      navigate(createPageUrl("Farmers"));
    },
    onError: async (error, variables) => {
      if (error.type === 'OFFLINE_SAVE') {
        try {
          // 1. Simpan ke SQLite
          const entity = 'farmer';
          const localId = await OfflineService.saveEntityLocally(entity,variables);
          const newFarmer = { ...variables, id: localId, sync_status: 'pending' }
          // 2. Update Cache TanStack Query secara manual (Optimistic Update)
          queryClient.setQueryData(["farmers"], (oldData) => {
            return oldData ? [newFarmer, ...oldData] : [newFarmer];
          });

          toast.info("Tersimpan secara lokal");
          // 3. Beri sedikit jeda agar Toast/Cache sempat terproses sebelum pindah halaman
          setTimeout(() => {
            navigate(createPageUrl("Farmers"));
          }, 500);

        } catch (sqlError) {
          console.error("SQLite Error:", sqlError);
          toast.error("Gagal simpan lokal");
        }
      }
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link to={createPageUrl("Farmers")}>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Registrasi Petani Baru</h1>
            <p className="text-slate-500">Isi data identitas dan alamat petani</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FarmerForm 
            onSubmit={(data) => createMutation.mutate(data)} 
            isLoading={createMutation.isPending}
          />
        </motion.div>
      </div>
    </div>
  );
}