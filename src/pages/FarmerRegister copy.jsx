import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { createPageUrl } from "@/utils";
import FarmerForm from "@/components/farmers/FarmerForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function FarmerRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Farmer.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["farmers"] });
      toast.success("Petani berhasil didaftarkan!");
      navigate(createPageUrl("FarmerDetail") + `?id=${data.id}`);
    },
    onError: (error) => {
      toast.error("Gagal mendaftarkan petani");
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
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

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FarmerForm 
            onSubmit={createMutation.mutate} 
            isLoading={createMutation.isPending}
          />
        </motion.div>
      </div>
    </div>
  );
}