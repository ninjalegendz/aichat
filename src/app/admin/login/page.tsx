
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Info } from "lucide-react";

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
        <CardFooter>
            <Card className="w-full text-sm text-muted-foreground p-3 bg-muted/50 border-dashed">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 mt-0.5 flex-shrink-0"/>
                    <div>
                        <p className="font-semibold text-card-foreground">Demo Account</p>
                        <p><strong>Email:</strong> admin@example.com</p>
                        <p><strong>Password:</strong> password</p>
                        <p className="mt-2 text-xs"><strong>Note:</strong> You must create this user in your Firebase project's Authentication tab first.</p>
                    </div>
                </div>
            </Card>
        </CardFooter>
      </Card>
    </main>
  );
}
