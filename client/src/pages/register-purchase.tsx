import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import strategyPlanLogo from "@assets/Strategy_Plan_Logo_2.0_1764811966337.png";

export default function RegisterPurchase() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    customerEmail: string;
    customerName: string;
    customerId: string;
    subscriptionId: string;
    priceId: string;
  } | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    setSessionId(sid);
    
    if (sid) {
      validateSession(sid);
    } else {
      setIsValidating(false);
      setError('No checkout session found');
    }
  }, []);

  const validateSession = async (sid: string) => {
    try {
      const response = await fetch(`/api/billing/checkout-session/${sid}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid session');
      }
      
      setSessionData(data);
      if (data.customerName) {
        const nameParts = data.customerName.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate checkout session');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!organizationName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter your organization or company name.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          password,
          firstName,
          lastName,
          organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast({
        title: "Account created!",
        description: "Welcome to ERP Team. Your subscription is active.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation('/');
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Verifying your purchase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-4 mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">
                Unable to Complete Registration
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-gray-500">
                If you completed a purchase, please check your email for a confirmation link or contact support.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')}
                data-testid="button-back-to-login"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={strategyPlanLogo} 
            alt="ERP Team Logo" 
            className="h-16 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ERP Team
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your account setup
          </p>
        </div>

        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-600 dark:text-green-400 font-medium">Payment Successful</span>
            </div>
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
              {sessionData?.customerEmail && (
                <span>Setting up account for <strong>{sessionData.customerEmail}</strong></span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Your Company Inc."
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  data-testid="input-organizationName"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-testid="input-firstName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-lastName"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={sessionData?.customerEmail || ''}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                  data-testid="input-email"
                />
                <p className="text-xs text-gray-500">Email is set from your purchase</p>
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
                  minLength={8}
                  data-testid="input-password"
                />
                <p className="text-xs text-gray-500">
                  Min 8 chars with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="input-confirmPassword"
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
                    Creating account...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setLocation('/')}
                className="text-sm text-primary hover:underline"
                data-testid="button-back-to-login"
              >
                Already have an account? Sign in
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Your subscription is now active. Set up your account to get started.
        </p>
      </div>
    </div>
  );
}
