import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, ArrowRight, Loader2 } from "lucide-react";
import strategyPlanLogo from "@assets/Strategy_Plan_Logo_2.0_1764811966337.png";

interface SessionInfo {
  customerEmail: string | null;
  customerName: string | null;
  planName: string | null;
}

export default function CheckoutSuccess() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      fetch(`/api/checkout-session/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.customerEmail) {
            setSessionInfo(data);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={strategyPlanLogo} alt="ERP Team Logo" className="w-24 h-24 object-contain" />
          </div>
        </div>

        <Card className="border-gray-200 dark:border-gray-800 shadow-lg" data-testid="card-checkout-success">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">
              Welcome to ERP Team!
            </CardTitle>
            <CardDescription className="text-base">
              Your payment was successful and your account is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Check Your Email
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    We've sent your login credentials to{" "}
                    {isLoading ? (
                      <Loader2 className="inline w-4 h-4 animate-spin" />
                    ) : sessionInfo?.customerEmail ? (
                      <span className="font-medium">{sessionInfo.customerEmail}</span>
                    ) : (
                      "your email address"
                    )}
                    . Please check your inbox (and spam folder) for your temporary password.
                  </p>
                </div>
              </div>
            </div>

            {sessionInfo?.planName && (
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Plan: <span className="font-medium text-gray-900 dark:text-white">{sessionInfo.planName}</span>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white text-center">
                Next Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li>Check your email for your login credentials</li>
                <li>Click the link below to sign in</li>
                <li>Change your password after logging in</li>
                <li>Start building your strategic plan!</li>
              </ol>
            </div>

            <div className="pt-2">
              <Link href="/landing">
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  size="lg"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-500">
              Didn't receive an email? Check your spam folder or contact{" "}
              <a href="mailto:support@leaderos.app" className="text-primary hover:underline">
                support@leaderos.app
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
