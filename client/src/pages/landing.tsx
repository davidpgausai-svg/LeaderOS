import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import strategyPlanLogo from "@assets/Strategy_Plan_Logo_2.0_1764811966337.png";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={strategyPlanLogo} alt="StrategyPlan Logo" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            StrategyPlan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Executive Planner: Design the strategy. Deliver the outcomes
          </p>
        </div>

        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sign in to continue</CardTitle>
            <CardDescription>
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 text-base rounded-xl"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center mt-4">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  Forgot your password?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Manage strategies, projects, and actions in one place
        </p>
      </div>
    </div>
  );
}
