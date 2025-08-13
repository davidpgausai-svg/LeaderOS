import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInitializer } from "@/components/user-initializer";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import Tactics from "@/pages/tactics";
import Outcomes from "@/pages/outcomes";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/framework" component={Strategies} />
      <Route path="/strategies" component={Tactics} />
      <Route path="/outcomes" component={Outcomes} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
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
