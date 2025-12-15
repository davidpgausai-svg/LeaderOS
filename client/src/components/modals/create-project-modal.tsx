import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type InsertProject } from "@shared/schema";
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
import { PeopleSelector } from "@/components/ui/people-selector";
import { Calendar, Users, Target } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId?: string;
}

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
  status: string;
};

export function CreateProjectModal({ isOpen, onClose, strategyId }: CreateProjectModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      title: "",
      description: "",
      strategyId: strategyId || "",
      kpi: "",
      kpiTracking: "",
      accountableLeaders: "[]",
      resourcesRequired: "",
      documentFolderUrl: null,
      communicationUrl: null,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: "NYS",
      createdBy: currentUser?.id || "",
    },
  });

  // Auto-select the strategy when modal opens with strategyId prop
  useEffect(() => {
    if (isOpen && strategyId) {
      form.setValue("strategyId", strategyId);
    }
  }, [isOpen, strategyId, form]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create project");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      form.reset();
      setSelectedLeaders([]);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleLeaderChange = (leaderId: string, checked: boolean) => {
    let newLeaders;
    if (checked) {
      newLeaders = [...selectedLeaders, leaderId];
    } else {
      newLeaders = selectedLeaders.filter(id => id !== leaderId);
    }
    setSelectedLeaders(newLeaders);
    form.setValue("accountableLeaders", JSON.stringify(newLeaders));
  };

  const onSubmit = (data: InsertProject) => {
    // Validate that at least one leader is selected
    if (selectedLeaders.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one accountable leader",
        variant: "destructive",
      });
      return;
    }

    // Ensure accountableLeaders is properly formatted and handle nullable URL fields
    const submitData = {
      ...data,
      accountableLeaders: JSON.stringify(selectedLeaders),
      documentFolderUrl: data.documentFolderUrl?.trim() || null,
      communicationUrl: data.communicationUrl?.trim() || null,
    };
    createProjectMutation.mutate(submitData);
  };

  const handleClose = () => {
    form.reset();
    setSelectedLeaders([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span>Create New Project</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter project title"
                        {...field}
                        data-testid="input-project-title"
                      />
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
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this project and its objectives"
                        {...field}
                        data-testid="textarea-project-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strategyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-strategy">
                          <SelectValue placeholder="Select a strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
            </div>

            {/* KPI Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-500" />
                <span>Key Performance Indicator</span>
              </h3>
              
              <FormField
                control={form.control}
                name="kpi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Number of partnerships established"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-kpi"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kpiTracking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI Tracking (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2 out of 5 partnerships signed"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-kpi-tracking"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Grant Project Access */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span>Grant Project Access to:</span>
              </h3>
              
              <div className="space-y-2">
                <FormLabel>Select People *</FormLabel>
                <PeopleSelector
                  users={(users as User[]) || []}
                  selectedUserIds={selectedLeaders}
                  onChange={(userIds) => {
                    setSelectedLeaders(userIds);
                    form.setValue("accountableLeaders", JSON.stringify(userIds));
                  }}
                  mode="multi"
                  placeholder="Search and select people..."
                  showRole
                />
                {selectedLeaders.length === 0 && (
                  <p className="text-sm text-red-500">At least one person must be selected</p>
                )}
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Resources</h3>
              
              <FormField
                control={form.control}
                name="resourcesRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resources Required (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Legal team, budget of $50k, marketing materials"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-resources"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentFolderUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Folder URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-document-folder-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                <span>Timeline</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => {
                    const dateValue = field.value instanceof Date && !isNaN(field.value.getTime()) 
                      ? field.value.toISOString().split('T')[0] 
                      : (typeof field.value === 'string' ? field.value : '');
                    
                    return (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateValue}
                            onChange={(e) => {
                              const date = new Date(e.target.value);
                              field.onChange(isNaN(date.getTime()) ? e.target.value : date);
                            }}
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => {
                    const dateValue = field.value instanceof Date && !isNaN(field.value.getTime()) 
                      ? field.value.toISOString().split('T')[0] 
                      : (typeof field.value === 'string' ? field.value : '');
                    
                    return (
                      <FormItem>
                        <FormLabel>Due Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateValue}
                            onChange={(e) => {
                              const date = new Date(e.target.value);
                              field.onChange(isNaN(date.getTime()) ? e.target.value : date);
                            }}
                            data-testid="input-due-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Progress is automatically calculated from completed actions
              </p>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NYS">Not Yet Started</SelectItem>
                        <SelectItem value="OT">On Track</SelectItem>
                        <SelectItem value="OH">On Hold</SelectItem>
                        <SelectItem value="B">Behind</SelectItem>
                        <SelectItem value="C">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProjectMutation.isPending || selectedLeaders.length === 0}
                data-testid="button-create-project"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
