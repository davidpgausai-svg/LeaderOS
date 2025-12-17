import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import strategyPlanLogo from "@assets/Strategy_Plan_Logo_2.0_1764811966337.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset link');
      }

      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Please try again later.",
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
          <img 
            src={strategyPlanLogo} 
            alt="LeaderOS Logo" 
            className="h-16 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            LeaderOS
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The Leader Operating System
          </p>
        </div>

        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          {isSubmitted ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription className="mt-2">
                  If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">Check your inbox</p>
                        <p className="text-blue-600 dark:text-blue-300">
                          The link will expire in 30 minutes. If you don't see the email, check your spam folder.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Link href="/landing">
                    <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Reset your password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
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

                  <Button 
                    type="submit" 
                    className="w-full py-6 text-base rounded-xl"
                    disabled={isLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <Link href="/landing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary" data-testid="link-back-to-login">
                      <ArrowLeft className="inline-block mr-1 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Manage strategies, projects, and actions in one place
        </p>
      </div>
    </div>
  );
}
