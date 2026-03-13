import { useState } from "react";
import  base44  from "@/api/Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TreePine, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const dataToken = localStorage.getItem('access_token')

  console.log(dataToken);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await base44.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;
      console.log(response,data)
      if (data.access_token) {
        // setUser(userData);
        setIsAuthenticated(true);

        localStorage.setItem('access_token', data.access_token);
        // localStorage.setItem('user_data', JSON.stringify(userData));

        toast.success("Login berhasil!");
        window.location.href = "/";
      } else {
        toast.error("Email atau password salah");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Terjadi kesalahan saat login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="border-0 shadow-xl max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <TreePine className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Selamat Datang</CardTitle>
          <p className="text-sm text-slate-500">Masuk ke akun Farmer Portal Anda</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="nama@email.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : "Masuk Sekarang"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500">
            Lupa password? Silakan hubungi admin koperasi.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
