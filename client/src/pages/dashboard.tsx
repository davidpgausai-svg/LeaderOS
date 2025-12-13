import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
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
  ChartLine,
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

  const formatDueDate = (dueDate: string | null): string => {
    if (!dueDate) return "No due date";
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const navigateToAction = (actionId: string, projectId: string) => {
    navigate(`/strategies?highlight=action-${actionId}&project=${projectId}`);
  };

  const navigateToProject = (projectId: string) => {
    navigate(`/strategies?highlight=project-${projectId}`);
  };

  const firstName = user?.firstName || 
    user?.email?.split('@')[0] || 
    'there';

  const isLoading = userLoading || todosLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg" style={{ color: '#86868B' }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const todoCount = myTodos?.length || 0;
  const projectCount = myProjects?.length || 0;

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Glassmorphism Header */}
        <header 
          className="sticky top-0 z-10 px-8 py-6 border-b"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#007AFF' }}
            >
              <ChartLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 
                className="text-3xl font-bold tracking-tight"
                style={{ color: '#1D1D1F' }}
              >
                Welcome back, {firstName}
              </h1>
              <p style={{ color: '#86868B' }} className="mt-0.5">
                Here's what's on your plate today
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Two Card Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Card - To-Dos */}
              <div 
                className="rounded-3xl p-6"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#007AFF' }}
                    >
                      <ListTodo className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: '#1D1D1F' }}>To-Dos</h2>
                      <p className="text-sm" style={{ color: '#86868B' }}>
                        Your assigned actions sorted by due date
                      </p>
                    </div>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: '#007AFF', color: '#FFFFFF' }}
                  >
                    {todoCount} {todoCount === 1 ? 'action' : 'actions'}
                  </span>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {todoCount > 0 ? (
                    myTodos?.map((todo) => {
                      const daysOverdue = getDaysOverdue(todo.dueDate);
                      const isOverdue = daysOverdue > 0;

                      return (
                        <div
                          key={todo.id}
                          className="p-4 rounded-xl transition-all cursor-pointer"
                          style={{ 
                            backgroundColor: '#FFFFFF',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#007AFF';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => navigateToAction(todo.id, todo.projectId)}
                          data-testid={`todo-item-${todo.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate" style={{ color: '#1D1D1F' }}>
                                  {todo.title}
                                </h3>
                                {isOverdue && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Flag className="h-4 w-4 flex-shrink-0" style={{ color: '#FF3B30' }} />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Action is overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {(todo.strategyName || todo.projectName) && (
                                <p className="text-xs truncate" style={{ color: '#86868B' }}>
                                  {[todo.strategyName, todo.projectName].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {todo.description && (
                                <p className="text-sm mt-1 line-clamp-2" style={{ color: '#1D1D1F' }}>
                                  {todo.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-sm" style={{ color: '#86868B' }}>
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span style={isOverdue ? { color: '#FF3B30', fontWeight: 500 } : {}}>
                                    {formatDueDate(todo.dueDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span 
                                className="px-2 py-1 rounded-full text-xs capitalize"
                                style={{
                                  backgroundColor: todo.status === 'in_progress' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                  color: todo.status === 'in_progress' ? '#007AFF' : '#86868B',
                                }}
                              >
                                {todo.status.replace('_', ' ')}
                              </span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                                      style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34C759' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAchievedMutation.mutate(todo.id);
                                      }}
                                      disabled={markAchievedMutation.isPending}
                                      data-testid={`button-mark-achieved-${todo.id}`}
                                    >
                                      <CheckCircle2 className="h-5 w-5" />
                                    </button>
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
                      <ClipboardList className="h-12 w-12 mx-auto mb-3" style={{ color: '#86868B' }} />
                      <h3 className="text-lg font-semibold mb-1" style={{ color: '#1D1D1F' }}>
                        All caught up!
                      </h3>
                      <p className="text-sm" style={{ color: '#86868B' }}>
                        You have no pending actions assigned to you
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Card - Your Projects */}
              <div 
                className="rounded-3xl p-6"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#AF52DE' }}
                    >
                      <FolderKanban className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: '#1D1D1F' }}>Your Projects</h2>
                      <p className="text-sm" style={{ color: '#86868B' }}>
                        Projects you're assigned to with your weekly allocation
                      </p>
                    </div>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: '#AF52DE', color: '#FFFFFF' }}
                  >
                    {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                  </span>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {projectCount > 0 ? (
                    myProjects?.map((project) => {
                      const daysOverdue = getDaysOverdue(project.dueDate);
                      const isOverdue = daysOverdue > 0;
                      const hoursPerWeek = parseFloat(project.hoursPerWeek) || 0;

                      return (
                        <div
                          key={project.id}
                          className="p-4 rounded-xl transition-all cursor-pointer"
                          style={{ 
                            backgroundColor: '#FFFFFF',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#AF52DE';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(175, 82, 222, 0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => navigateToProject(project.id)}
                          data-testid={`project-item-${project.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate" style={{ color: '#1D1D1F' }}>
                                  {project.title}
                                </h3>
                                {isOverdue && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Flag className="h-4 w-4 flex-shrink-0" style={{ color: '#FF3B30' }} />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Project is overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm mt-1 line-clamp-2" style={{ color: '#1D1D1F' }}>
                                  {project.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-sm" style={{ color: '#86868B' }}>
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span style={isOverdue ? { color: '#FF3B30', fontWeight: 500 } : {}}>
                                    {formatDueDate(project.dueDate)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm" style={{ color: '#AF52DE' }}>
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
                      <FolderKanban className="h-12 w-12 mx-auto mb-3" style={{ color: '#86868B' }} />
                      <h3 className="text-lg font-semibold mb-1" style={{ color: '#1D1D1F' }}>
                        No projects yet
                      </h3>
                      <p className="text-sm" style={{ color: '#86868B' }}>
                        You haven't been assigned to any projects
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
