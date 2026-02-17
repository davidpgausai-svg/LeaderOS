import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInitializer } from "@/components/user-initializer";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Timeline from "@/pages/timeline";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import ForceChangePassword from "@/pages/force-change-password";
import DecisionLog from "@/pages/decision-log";
import Setup from "@/pages/setup";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [setupChecked, setSetupChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/setup-status")
      .then(res => res.json())
      .then(data => {
        setNeedsSetup(data.needsSetup === true);
        setSetupChecked(true);
      })
      .catch(() => {
        setSetupChecked(true);
      });
  }, []);

  useEffect(() => {
    if (setupChecked && needsSetup && !isLoading) {
      setLocation("/setup");
    }
  }, [setupChecked, needsSetup, isLoading, setLocation]);

  if (isLoading || !setupChecked) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/setup" component={Setup} />
        <Route path="/register/:token" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/landing" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // If user must change password, force them to the password change page
  if (user?.mustChangePassword === 'true') {
    return <ForceChangePassword />;
  }

  return (
    <>
      <Switch>
        <Route path="/register/:token" component={Register} />
        <Route path="/" component={Dashboard} />
        <Route path="/strategies" component={Strategies} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/calendar" component={Calendar} />
        {/* Graph moved to Reports tab - redirect for backward compatibility */}
        <Route path="/graph">{() => { window.location.replace('/reports?tab=graph'); return null; }}</Route>
        <Route path="/decision-log" component={DecisionLog} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserInitializer>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </UserInitializer>
    </QueryClientProvider>
  );
}

export default App;
