import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ListTodo,
  FolderKanban,
  Flag,
  Calendar,
  Clock,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TodoAction {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  projectId: string;
  strategyId: string;
  assignmentId?: string;
  projectName: string | null;
  strategyName: string | null;
}

interface MyProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  strategyId: string;
  hoursPerWeek: string;
  assignmentId?: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: userLoading } = useAuth();

  const { data: myTodos, isLoading: todosLoading } = useQuery<TodoAction[]>({
    queryKey: ["/api/my-todos"],
  });

  const { data: myProjects, isLoading: projectsLoading } = useQuery<MyProject[]>({
    queryKey: ["/api/my-projects"],
  });

  // Mutation to mark action as achieved
  const markAchievedMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest("PATCH", `/api/actions/${actionId}`, { status: "achieved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Action completed",
        description: "The action has been marked as achieved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark action as achieved.",
        variant: "destructive",
      });
    },
  });

  // Calculate days overdue
  const getDaysOverdue = (dueDate: string | null): number => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Format due date display
  const formatDueDate = (dueDate: string | null): string => {
    if (!dueDate) return "No due date";
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Navigate to action with highlight (uses existing URL format from timeline)
  const navigateToAction = (actionId: string, projectId: string) => {
    navigate(`/strategies?highlight=action-${actionId}&project=${projectId}`);
  };

  // Navigate to project with highlight (uses existing URL format from timeline)
  const navigateToProject = (projectId: string) => {
    navigate(`/strategies?highlight=project-${projectId}`);
  };

  // Get user's first name for greeting
  const firstName = user?.firstName || 
    user?.email?.split('@')[0] || 
    'there';

  const isLoading = userLoading || todosLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-500 dark:text-gray-400">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const todoCount = myTodos?.length || 0;
  const projectCount = myProjects?.length || 0;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {firstName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's what's on your plate today
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Two Card Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Card - To-Dos */}
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">To-Dos</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-primary text-white">
                      {todoCount} {todoCount === 1 ? 'action' : 'actions'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your assigned actions sorted by due date
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {todoCount > 0 ? (
                    myTodos?.map((todo) => {
                      const daysOverdue = getDaysOverdue(todo.dueDate);
                      const isOverdue = daysOverdue > 0;

                      return (
                        <div
                          key={todo.id}
                          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                          onClick={() => navigateToAction(todo.id, todo.projectId)}
                          data-testid={`todo-item-${todo.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {todo.title}
                                </h3>
                                {isOverdue && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Flag className="h-4 w-4 text-red-500 flex-shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Action is overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {(todo.strategyName || todo.projectName) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {[todo.strategyName, todo.projectName].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {todo.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {todo.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                    {formatDueDate(todo.dueDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs capitalize ${
                                  todo.status === 'in_progress' 
                                    ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-300 text-gray-600'
                                }`}
                              >
                                {todo.status.replace('_', ' ')}
                              </Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAchievedMutation.mutate(todo.id);
                                      }}
                                      disabled={markAchievedMutation.isPending}
                                      data-testid={`button-mark-achieved-${todo.id}`}
                                    >
                                      <CheckCircle2 className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Mark as achieved</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardList className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        All caught up!
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You have no pending actions assigned to you
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Card - Your Projects */}
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-xl">Your Projects</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Projects you're assigned to with your weekly allocation
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {projectCount > 0 ? (
                    myProjects?.map((project) => {
                      const daysOverdue = getDaysOverdue(project.dueDate);
                      const isOverdue = daysOverdue > 0;
                      const hoursPerWeek = parseFloat(project.hoursPerWeek) || 0;

                      return (
                        <div
                          key={project.id}
                          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer"
                          onClick={() => navigateToProject(project.id)}
                          data-testid={`project-item-${project.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {project.title}
                                </h3>
                                {isOverdue && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Flag className="h-4 w-4 text-red-500 flex-shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Project is overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                    {formatDueDate(project.dueDate)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{hoursPerWeek} hrs/week</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <FolderKanban className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No projects yet
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You haven't been assigned to any projects
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
