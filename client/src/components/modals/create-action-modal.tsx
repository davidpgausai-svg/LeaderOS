import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActionSchema, type InsertAction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Phase = {
  id: string;
  name: string;
  strategyId: string;
  orderIndex: number;
};

interface CreateActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId?: string;
  projectId?: string;
  workstreamId?: string;
  isWorkstreamTask?: boolean;
}

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
  status: string;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
};

export function CreateActionModal({ open, onOpenChange, strategyId, projectId, workstreamId, isWorkstreamTask }: CreateActionModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ["/api/phases", strategyId],
    queryFn: async () => {
      if (!strategyId) return [];
      const res = await fetch(`/api/phases?strategyId=${strategyId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!isWorkstreamTask && !!strategyId,
  });

  const form = useForm<InsertAction>({
    resolver: zodResolver(insertActionSchema),
    defaultValues: {
      title: "",
      description: "",
      strategyId: strategyId || undefined,
      projectId: projectId || undefined,
      status: "in_progress",
      dueDate: undefined,
      createdBy: currentUser?.id || "",
    },
  });

  // Auto-select the strategy and project when modal opens with props
  useEffect(() => {
    if (open && strategyId) {
      form.setValue("strategyId", strategyId);
    }
    if (open && projectId) {
      form.setValue("projectId", projectId);
    }
  }, [open, strategyId, projectId, form]);

  const createActionMutation = useMutation({
    mutationFn: async (data: InsertAction) => {
      if (isWorkstreamTask && workstreamId) {
        const response = await apiRequest("POST", "/api/workstream-tasks", {
          name: data.title,
          workstreamId,
          phaseId: selectedPhaseId || null,
          projectId: data.projectId,
          description: data.description,
          status: data.status,
          isMilestone: "false",
        });
        return response.json();
      }
      const response = await apiRequest("POST", "/api/actions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-todos"] });
      if (isWorkstreamTask) {
        queryClient.invalidateQueries({ predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key.startsWith('/api/workstream-tasks') || key.startsWith('/api/workstream-calculations'));
        }});
      }
      toast({
        title: "Success",
        description: isWorkstreamTask ? "Task created successfully" : "Action created successfully",
      });
      form.reset();
      setSelectedPhaseId(null);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: isWorkstreamTask ? "Failed to create task" : "Failed to create action",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAction) => {
    // Ensure strategyId is provided (required field)
    if (!data.strategyId || data.strategyId === "placeholder") {
      toast({
        title: "Error",
        description: "Please select a priority",
        variant: "destructive",
      });
      return;
    }

    // Ensure projectId is provided (required field)
    if (!data.projectId || data.projectId === "none") {
      toast({
        title: "Error",
        description: "Please select a related project",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty optional fields
    const cleanData = {
      ...data,
      projectId: data.projectId,
      dueDate: data.dueDate || undefined,
    };
    createActionMutation.mutate(cleanData);
  };

  const selectedStrategy = form.watch("strategyId");
  const filteredProjects = (projects as Project[])?.filter(project => 
    project.strategyId === selectedStrategy
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isWorkstreamTask ? "Create New Task" : "Create New Action"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isWorkstreamTask ? "Task Title" : "Action Title"}</FormLabel>
                      <FormControl>
                        <Input placeholder={isWorkstreamTask ? "Enter task title..." : "Enter action title..."} {...field} data-testid="input-action-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the expected action..." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-action-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Strategy & Project Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Assignment</h3>
                
                <FormField
                  control={form.control}
                  name="strategyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "placeholder"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-action-strategy">
                            <SelectValue placeholder="Select a strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="placeholder">Select a strategy</SelectItem>
                          {(strategies as Strategy[])?.filter((s) => s.status !== 'Archived').map((strategy) => (
                            <SelectItem key={strategy.id} value={strategy.id}>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: strategy.colorCode }}
                                />
                                <span>{strategy.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Project *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                        disabled={!selectedStrategy || filteredProjects.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-action-project">
                            <SelectValue placeholder="Select a related project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isWorkstreamTask && phases.length > 0 && (
                  <div>
                    <FormLabel>Phase</FormLabel>
                    <Select
                      onValueChange={(val) => setSelectedPhaseId(val === "no_phase" ? null : val)}
                      value={selectedPhaseId || "no_phase"}
                    >
                      <SelectTrigger data-testid="select-action-phase">
                        <SelectValue placeholder="Select a phase (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_phase">No Phase</SelectItem>
                        {phases
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((phase) => (
                            <SelectItem key={phase.id} value={phase.id}>
                              {phase.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Status & Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Status & Timeline</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-action-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="achieved">Achieved</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-action-due-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-action"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createActionMutation.isPending}
                data-testid="button-create-action"
              >
                {createActionMutation.isPending ? "Creating..." : isWorkstreamTask ? "Create Task" : "Create Action"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
