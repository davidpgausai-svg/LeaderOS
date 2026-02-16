import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActionSchema, type InsertAction, type ActionDocument, type ActionChecklistItem } from "@shared/schema";

type Action = {
  id: string;
  title: string;
  description: string;
  strategyId: string;
  projectId?: string | null;
  targetValue?: string | null;
  currentValue?: string | null;
  measurementUnit?: string | null;
  status: string;
  dueDate?: string | Date | null;
  isArchived: string;
  createdBy: string;
  createdAt: string | Date | null;
  workstreamId?: string | null;
  phaseId?: string | null;
};

type Phase = {
  id: string;
  name: string;
  strategyId: string;
  orderIndex: number;
};
import { apiRequest } from "@/lib/queryClient";
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
import { CalendarIcon, Plus, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface EditActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Action | null;
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

export function EditActionModal({ open, onOpenChange, action }: EditActionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  const isWorkstreamTask = !!action?.workstreamId;

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ["/api/phases", action?.strategyId],
    queryFn: async () => {
      if (!action?.strategyId) return [];
      const res = await fetch(`/api/phases?strategyId=${action.strategyId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isWorkstreamTask && !!action?.strategyId,
  });

  const { data: documents = [] } = useQuery<ActionDocument[]>({
    queryKey: ["/api/actions", action?.id, "documents"],
    enabled: !!action?.id,
  });

  const { data: checklistItems = [] } = useQuery<ActionChecklistItem[]>({
    queryKey: ["/api/actions", action?.id, "checklist"],
    enabled: !!action?.id,
  });

  const form = useForm<InsertAction>({
    resolver: zodResolver(insertActionSchema),
    defaultValues: {
      title: "",
      description: "",
      strategyId: "",
      projectId: undefined,
      status: "in_progress",
      dueDate: undefined,
      createdBy: "",
    },
  });

  useEffect(() => {
    if (action) {
      form.reset({
        title: action.title,
        description: action.description,
        strategyId: action.strategyId,
        projectId: action.projectId || undefined,
        status: action.status,
        dueDate: action.dueDate ? new Date(action.dueDate) : undefined,
        createdBy: action.createdBy,
      });
      setSelectedPhaseId(action.phaseId || null);
    }
  }, [action, form]);

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertAction }) => {
      const response = await apiRequest("PATCH", `/api/actions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-todos"] });
      toast({
        title: "Success",
        description: isWorkstreamTask ? "Task updated successfully" : "Action updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update action",
        variant: "destructive",
      });
    },
  });

  // Document mutations
  const createDocumentMutation = useMutation({
    mutationFn: async ({ actionId, name, url }: { actionId: string; name: string; url: string }) => {
      const response = await apiRequest("POST", `/api/actions/${actionId}/documents`, { name, url });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", action?.id, "documents"] });
      setNewDocName("");
      setNewDocUrl("");
      toast({
        title: "Success",
        description: "Document added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add document",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ actionId, docId }: { actionId: string; docId: string }) => {
      await apiRequest("DELETE", `/api/actions/${actionId}/documents/${docId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", action?.id, "documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Checklist item mutations
  const createChecklistItemMutation = useMutation({
    mutationFn: async ({ actionId, title }: { actionId: string; title: string }) => {
      const response = await apiRequest("POST", `/api/actions/${actionId}/checklist`, {
        title,
        isCompleted: 'false',
        orderIndex: checklistItems.length,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", action?.id, "checklist"] });
      setNewChecklistItem("");
      toast({
        title: "Success",
        description: "Checklist item added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add checklist item",
        variant: "destructive",
      });
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ actionId, itemId, isCompleted }: { actionId: string; itemId: string; isCompleted: boolean }) => {
      const response = await apiRequest("PATCH", `/api/actions/${actionId}/checklist/${itemId}`, { isCompleted });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", action?.id, "checklist"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: async ({ actionId, itemId }: { actionId: string; itemId: string }) => {
      await apiRequest("DELETE", `/api/actions/${actionId}/checklist/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", action?.id, "checklist"] });
      toast({
        title: "Success",
        description: "Checklist item deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete checklist item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAction) => {
    if (!action) return;

    // Ensure strategyId is provided (required field)
    if (!data.strategyId || data.strategyId === "placeholder") {
      toast({
        title: "Error",
        description: "Please select a strategy",
        variant: "destructive",
      });
      return;
    }

    const cleanData: any = {
      ...data,
      projectId: data.projectId === "none" ? undefined : data.projectId || undefined,
      dueDate: data.dueDate || undefined,
    };
    if (isWorkstreamTask) {
      cleanData.phaseId = selectedPhaseId || null;
    }
    updateActionMutation.mutate({ id: action.id, data: cleanData });
  };

  const handleAddDocument = () => {
    if (!action || !newDocName.trim() || !newDocUrl.trim()) return;
    createDocumentMutation.mutate({ actionId: action.id, name: newDocName.trim(), url: newDocUrl.trim() });
  };

  const handleDeleteDocument = (docId: string) => {
    if (!action) return;
    deleteDocumentMutation.mutate({ actionId: action.id, docId });
  };

  const handleAddChecklistItem = () => {
    if (!action || !newChecklistItem.trim()) return;
    createChecklistItemMutation.mutate({ actionId: action.id, title: newChecklistItem.trim() });
  };

  const handleToggleChecklistItem = (itemId: string, isCompleted: boolean) => {
    if (!action) return;
    updateChecklistItemMutation.mutate({ actionId: action.id, itemId, isCompleted: !isCompleted });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!action) return;
    deleteChecklistItemMutation.mutate({ actionId: action.id, itemId });
  };

  const selectedStrategy = form.watch("strategyId");
  const filteredProjects = (projects as Project[])?.filter(project => 
    project.strategyId === selectedStrategy
  ) || [];

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isWorkstreamTask ? "Edit Task" : "Edit Action"}</DialogTitle>
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
                      <FormLabel>Action Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter action title..." {...field} data-testid="input-edit-action-title" />
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
                          data-testid="textarea-edit-action-description"
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
                      <FormLabel>Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "placeholder"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-action-strategy">
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
                      <FormLabel>Related Project (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "none"}
                        disabled={!selectedStrategy || filteredProjects.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-action-project">
                            <SelectValue placeholder="Select a related project (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific project</SelectItem>
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
                      <SelectTrigger data-testid="select-edit-action-phase">
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

              {/* Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Documents</h3>
                
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded bg-background dark:bg-gray-800">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 hover:underline text-blue-600 dark:text-blue-400 truncate"
                          data-testid={`link-document-${doc.id}`}
                        >
                          <ExternalLink className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{doc.name}</span>
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        data-testid={`button-delete-document-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      placeholder="Document name..."
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      data-testid="input-new-document-name"
                    />
                    <Input
                      placeholder="Document URL..."
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      data-testid="input-new-document-url"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDocument}
                    disabled={!newDocName.trim() || !newDocUrl.trim() || createDocumentMutation.isPending}
                    data-testid="button-add-document"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Checklist</h3>
                
                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded bg-background dark:bg-gray-800">
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          checked={item.isCompleted === 'true'}
                          onCheckedChange={() => handleToggleChecklistItem(item.id, item.isCompleted === 'true')}
                          data-testid={`checkbox-checklist-${item.id}`}
                        />
                        <span className={cn(
                          "flex-1",
                          item.isCompleted === 'true' && "line-through text-muted-foreground"
                        )}>
                          {item.title}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        data-testid={`button-delete-checklist-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="New checklist item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                      data-testid="input-new-checklist-item"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddChecklistItem}
                      disabled={!newChecklistItem.trim() || createChecklistItemMutation.isPending}
                      data-testid="button-add-checklist-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-action-status">
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
                                data-testid="button-edit-action-due-date"
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
                data-testid="button-cancel-edit-action"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateActionMutation.isPending}
                data-testid="button-update-action"
              >
                {updateActionMutation.isPending ? "Updating..." : "Update Action"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
