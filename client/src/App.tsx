import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInitializer } from "@/components/user-initializer";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import Tactics from "@/pages/tactics";
import Outcomes from "@/pages/outcomes";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Timeline from "@/pages/timeline";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/framework" component={Strategies} />
          <Route path="/strategies" component={Tactics} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/outcomes" component={Outcomes} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
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
