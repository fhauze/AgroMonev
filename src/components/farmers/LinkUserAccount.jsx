import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LinkUserAccount({ farmerId, onLinked }) {
  const [email, setEmail] = useState("");

  const linkMutation = useMutation({
    mutationFn: async (userEmail) => {
      await base44.entities.Farmer.update(farmerId, { 
        user_email: userEmail 
      });
    },
    onSuccess: () => {
      toast.success("Akun berhasil dihubungkan!");
      setEmail("");
      onLinked?.();
    },
    onError: () => {
      toast.error("Gagal menghubungkan akun");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Masukkan email user");
      return;
    }
    linkMutation.mutate(email);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label className="text-sm text-slate-600">Hubungkan Akun User</Label>
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email user petani"
          className="flex-1 h-9 text-sm"
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={linkMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {linkMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Petani dapat login dengan email ini untuk mengelola data sendiri
      </p>
    </form>
  );
}