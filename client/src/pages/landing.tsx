import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            StrategicFlow
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Strategic planning platform for organizational excellence
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Platform Features
            </h2>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></span>
                Framework Management
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
                Strategy Implementation
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Progress Tracking
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Comprehensive Reports
              </li>
            </ul>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700"
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}