import { Button } from "@/components/ui/button";
import { ChartLine } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6">
            <ChartLine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Executive Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Strategic planning for organizational excellence
          </p>
        </div>

        {/* Sign-in Card */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Sign in to continue
          </h2>
          
          <Button 
            onClick={handleLogin}
            size="lg"
            className="w-full text-base py-6 rounded-xl"
            data-testid="button-login"
          >
            Sign in with Replit
          </Button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
            Secure authentication powered by Replit
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Manage strategies, projects, and actions in one place
        </p>
      </div>
    </div>
  );
}
