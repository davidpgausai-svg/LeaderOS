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
import Projects from "@/pages/projects";
import Actions from "@/pages/actions";
import MeetingNotes from "@/pages/meeting-notes";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Timeline from "@/pages/timeline";
import Graph from "@/pages/graph";
import Documentation from "@/pages/documentation";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not authenticated, redirect all routes to landing page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/strategies" component={Strategies} />
        <Route path="/projects" component={Projects} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/graph" component={Graph} />
        <Route path="/actions" component={Actions} />
        <Route path="/meeting-notes" component={MeetingNotes} />
        <Route path="/reports" component={Reports} />
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
