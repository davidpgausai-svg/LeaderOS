import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInitializer } from "@/components/user-initializer";
import { useAuth } from "@/hooks/useAuth";
import { AiChatAssistant } from "@/components/ai-chat/ai-chat-assistant";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import MeetingNotes from "@/pages/meeting-notes";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Timeline from "@/pages/timeline";
import Calendar from "@/pages/calendar";
import Documentation from "@/pages/documentation";
import Templates from "@/pages/templates";
import SwotTemplate from "@/pages/templates/swot";
import SmartGoalsTemplate from "@/pages/templates/smart-goals";
import EisenhowerMatrixTemplate from "@/pages/templates/eisenhower-matrix";
import StrategyOnAPage from "@/pages/templates/strategy-on-a-page";
import PestleTemplate from "@/pages/templates/pestle";
import PortersFiveForcesTemplate from "@/pages/templates/porters-five-forces";
import FirstPrinciplesTemplate from "@/pages/templates/first-principles";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not authenticated, show landing (login) page and registration page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register/:token" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/landing" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/strategies" component={Strategies} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/calendar" component={Calendar} />
        {/* Graph moved to Reports tab - redirect for backward compatibility */}
        <Route path="/graph">{() => { window.location.replace('/reports?tab=graph'); return null; }}</Route>
        <Route path="/meeting-notes" component={MeetingNotes} />
        <Route path="/reports" component={Reports} />
        <Route path="/templates" component={Templates} />
        <Route path="/templates/strategy-on-a-page" component={StrategyOnAPage} />
        <Route path="/templates/pestle" component={PestleTemplate} />
        <Route path="/templates/porters-five-forces" component={PortersFiveForcesTemplate} />
        <Route path="/templates/swot" component={SwotTemplate} />
        <Route path="/templates/smart-goals" component={SmartGoalsTemplate} />
        <Route path="/templates/eisenhower-matrix" component={EisenhowerMatrixTemplate} />
        <Route path="/templates/first-principles" component={FirstPrinciplesTemplate} />
        <Route path="/documentation" component={Documentation} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
      <AiChatAssistant />
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
