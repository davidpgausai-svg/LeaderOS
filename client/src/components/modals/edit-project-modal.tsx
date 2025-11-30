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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Users, Target, Edit } from "lucide-react";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
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
};

export function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
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
      strategyId: "",
      kpi: "",
      kpiTracking: "",
      accountableLeaders: "[]",
      resourcesRequired: "",
      documentFolderUrl: null,
      communicationUrl: null,
      startDate: new Date(),
      dueDate: new Date(),
      status: "NYS",
      createdBy: currentUser?.id || "",
    },
  });

  // Update form when project changes
  useEffect(() => {
    if (project && isOpen) {
      try {
        const leaders = JSON.parse(project.accountableLeaders || "[]");
        setSelectedLeaders(leaders);
        
        form.reset({
          title: project.title || "",
          description: project.description || "",
          strategyId: project.strategyId || "",
          kpi: project.kpi || "",
          kpiTracking: project.kpiTracking || "",
          accountableLeaders: project.accountableLeaders || "[]",
          resourcesRequired: project.resourcesRequired || "",
          documentFolderUrl: project.documentFolderUrl || null,
          communicationUrl: project.communicationUrl || null,
          startDate: new Date(project.startDate),
          dueDate: new Date(project.dueDate),
          status: project.status || "NYS",
          createdBy: project.createdBy || "",
        });
      } catch (error) {
        console.error("Error parsing project data:", error);
      }
    }
  }, [project, isOpen, form]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("PATCH", `/api/projects/${project.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
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
    const submitData = {
      ...data,
      accountableLeaders: JSON.stringify(selectedLeaders),
    };
    updateProjectMutation.mutate(submitData);
  };

  const handleClose = () => {
    onClose();
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5 text-blue-500" />
            <span>Edit Project</span>
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
                        data-testid="input-edit-project-title"
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
                        data-testid="textarea-edit-project-description"
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
                    <FormLabel>Strategy *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-strategy">
                          <SelectValue placeholder="Select a strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(strategies as Strategy[])?.map((strategy) => (
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

            {/* KPI Section - Key Focus Area */}
            <div className="space-y-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-500" />
                <span>Key Performance Indicator</span>
              </h3>
              
              <FormField
                control={form.control}
                name="kpi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI Definition *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Reduce employee turnover below 17%"
                        {...field}
                        data-testid="input-edit-kpi"
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
                    <FormLabel>Current KPI Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Current turnover rate: 17.9%"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-kpi-tracking"
                      />
                    </FormControl>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Track your current progress against the KPI target
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Accountable Leaders */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span>Accountable Leaders</span>
              </h3>
              
              <div className="space-y-2">
                <FormLabel>Select Leaders *</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {(users as User[])?.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-leader-${user.id}`}
                        checked={selectedLeaders.includes(user.id)}
                        onCheckedChange={(checked) => handleLeaderChange(user.id, !!checked)}
                        data-testid={`checkbox-edit-leader-${user.id}`}
                      />
                      <label 
                        htmlFor={`edit-leader-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName} (${user.email})`
                          : user.email
                        }
                      </label>
                    </div>
                  ))}
                </div>
                {selectedLeaders.length === 0 && (
                  <p className="text-sm text-red-500">At least one leader must be selected</p>
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
                    <FormLabel>Resources Required</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., HR team, budget for training programs, exit interview software"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-edit-resources"
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
                        data-testid="input-edit-document-folder-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="communicationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-communication-url"
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-edit-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-edit-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
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
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProjectMutation.isPending || selectedLeaders.length === 0}
                data-testid="button-save-project"
              >
                {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
