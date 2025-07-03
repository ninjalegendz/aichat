
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             <BrainCircuit className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">ShopAssist AI Admin</CardTitle>
          <CardDescription>Sign in to manage your support tickets.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
