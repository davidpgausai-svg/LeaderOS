import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import strategyPlanLogo from "@assets/Strategy_Plan_Logo_2.0_1764811966337.png";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isResending, setIsResending] = useState(false);
  const { login, verify2FA, resend2FA } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.requires2FA) {
        setRequires2FA(true);
        setPendingUserId(result.userId);
        toast({
          title: "Verification required",
          description: "A verification code has been sent to your email.",
        });
      } else {
        window.location.href = '/';
      }
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

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUserId) return;
    
    setIsLoading(true);

    try {
      await verify2FA(pendingUserId, verificationCode);
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUserId) return;
    
    setIsResending(true);

    try {
      await resend2FA(pendingUserId);
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setPendingUserId(null);
    setVerificationCode("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={strategyPlanLogo} alt="StrategyPlan Logo" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ERP Team
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The ERP Operating System
          </p>
        </div>

        {!requires2FA ? (
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
        ) : (
          <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription>
                We sent a verification code to {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-verification-code"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full py-6 text-base rounded-xl"
                  disabled={isLoading || verificationCode.length !== 6}
                  data-testid="button-verify"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <div className="flex flex-col gap-3 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="text-sm"
                    data-testid="button-resend-code"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Didn't receive the code? Resend"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBackToLogin}
                    className="text-sm"
                    data-testid="button-back-to-login"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Manage strategies, projects, and actions in one place
        </p>
      </div>
    </div>
  );
}
