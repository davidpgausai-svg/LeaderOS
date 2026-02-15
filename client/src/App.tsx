import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInitializer } from "@/components/user-initializer";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import MeetingNotes from "@/pages/meeting-notes";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Timeline from "@/pages/timeline";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import SuperAdmin from "@/pages/super-admin";
import ForceChangePassword from "@/pages/force-change-password";
import IntakeForms from "@/pages/intake-forms";
import IntakeSubmissions from "@/pages/intake-submissions";
import PublicIntake from "@/pages/public-intake";
import ReportOut from "@/pages/report-out";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not authenticated, show landing (login) page and registration page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register/:token" component={Register} />
        <Route path="/intake/:slug" component={PublicIntake} />
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
        <Route path="/meeting-notes" component={MeetingNotes} />
        <Route path="/report-out" component={ReportOut} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/intake-forms" component={IntakeForms} />
        <Route path="/intake-submissions" component={IntakeSubmissions} />
        <Route path="/intake/:slug" component={PublicIntake} />
        <Route path="/super-admin" component={SuperAdmin} />
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
