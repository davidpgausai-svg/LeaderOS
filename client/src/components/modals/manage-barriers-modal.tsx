import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBarrierSchema, type InsertBarrier, type Barrier } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, Plus, Edit, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManageBarriersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type ViewMode = "list" | "add" | "edit";

export function ManageBarriersModal({ isOpen, onClose, projectId }: ManageBarriersModalProps) {
  const { currentUser, currentRole, canEditProjects } = useRole();
  const isViewOnly = currentRole === 'view';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingBarrier, setEditingBarrier] = useState<Barrier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [barrierToDelete, setBarrierToDelete] = useState<string | null>(null);

  const { data: barriers, isLoading: barriersLoading } = useQuery({
    queryKey: ["/api/barriers", projectId],
    queryFn: async () => {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`/api/barriers?projectId=${projectId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Failed to fetch barriers");
      return response.json();
    },
    enabled: isOpen,
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const form = useForm<InsertBarrier>({
    resolver: zodResolver(insertBarrierSchema),
    defaultValues: {
      projectId: projectId,
      title: "",
      description: "",
      severity: "medium",
      status: "active",
      ownerId: undefined,
      targetResolutionDate: undefined,
      resolutionNotes: "",
    },
  });

  const watchedStatus = form.watch("status");

  // Reset form when switching modes
  useEffect(() => {
    if (viewMode === "add") {
      form.reset({
        projectId: projectId,
        title: "",
        description: "",
        severity: "medium",
        status: "active",
        ownerId: undefined,
        targetResolutionDate: undefined,
        resolutionNotes: "",
      });
    } else if (viewMode === "edit" && editingBarrier) {
      form.reset({
        projectId: editingBarrier.projectId,
        title: editingBarrier.title,
        description: editingBarrier.description,
        severity: editingBarrier.severity,
        status: editingBarrier.status,
        ownerId: editingBarrier.ownerId || undefined,
        targetResolutionDate: editingBarrier.targetResolutionDate ? new Date(editingBarrier.targetResolutionDate) : undefined,
        resolutionNotes: editingBarrier.resolutionNotes || "",
      });
    }
  }, [viewMode, editingBarrier, projectId, form]);

  const createBarrierMutation = useMutation({
    mutationFn: async (data: InsertBarrier) => {
      const response = await apiRequest("POST", "/api/barriers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barriers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/barriers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Barrier created successfully",
      });
      setViewMode("list");
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create barrier",
        variant: "destructive",
      });
    },
  });

  const updateBarrierMutation = useMutation({
    mutationFn: async (data: InsertBarrier) => {
      if (!editingBarrier) throw new Error("No barrier selected");
      const response = await apiRequest("PATCH", `/api/barriers/${editingBarrier.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barriers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/barriers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Barrier updated successfully",
      });
      setViewMode("list");
      setEditingBarrier(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update barrier",
        variant: "destructive",
      });
    },
  });

  const deleteBarrierMutation = useMutation({
    mutationFn: async (barrierId: string) => {
      const response = await apiRequest("DELETE", `/api/barriers/${barrierId}`, {});
      // DELETE returns 204 No Content, so don't parse JSON
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barriers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/barriers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Barrier deleted successfully",
      });
      setDeleteDialogOpen(false);
      setBarrierToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete barrier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBarrier) => {
    if (viewMode === "add") {
      createBarrierMutation.mutate(data);
    } else if (viewMode === "edit") {
      updateBarrierMutation.mutate(data);
    }
  };

  const handleEdit = (barrier: Barrier) => {
    setEditingBarrier(barrier);
    setViewMode("edit");
  };

  const handleDelete = (barrierId: string) => {
    setBarrierToDelete(barrierId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (barrierToDelete) {
      deleteBarrierMutation.mutate(barrierToDelete);
    }
  };

  const handleClose = () => {
    setViewMode("list");
    setEditingBarrier(null);
    form.reset();
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "destructive";
      case "mitigated":
        return "default";
      case "resolved":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "mitigated":
        return "Mitigated";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return status;
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = (users as User[])?.find(u => u.id === userId);
    if (!user) return "Unknown User";
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              <span>Manage Barriers</span>
            </DialogTitle>
          </DialogHeader>

          {viewMode === "list" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Track and manage risks and obstacles for this project
                </p>
                {!isViewOnly && (
                  <Button
                    onClick={() => setViewMode("add")}
                    size="sm"
                    data-testid="button-add-barrier"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Barrier
                  </Button>
                )}
              </div>

              {barriersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading barriers...</p>
                </div>
              ) : !barriers || barriers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No barriers identified for this project
                  </p>
                  {!isViewOnly && (
                    <Button
                      onClick={() => setViewMode("add")}
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      data-testid="button-add-first-barrier"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Barrier
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {barriers.map((barrier: Barrier) => (
                      <div
                        key={barrier.id}
                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors dark:border-gray-700"
                        data-testid={`barrier-item-${barrier.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={cn("w-3 h-3 rounded-full flex-shrink-0", getSeverityColor(barrier.severity))}
                                data-testid={`severity-indicator-${barrier.id}`}
                              />
                              <h4 className="font-semibold text-sm truncate" data-testid={`barrier-title-${barrier.id}`}>
                                {barrier.title}
                              </h4>
                              <Badge 
                                variant={getStatusBadgeVariant(barrier.status) as any}
                                className="flex-shrink-0"
                                data-testid={`barrier-status-${barrier.id}`}
                              >
                                {getStatusLabel(barrier.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2" data-testid={`barrier-description-${barrier.id}`}>
                              {barrier.description}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span data-testid={`barrier-owner-${barrier.id}`}>
                                <strong>Owner:</strong> {getUserName(barrier.ownerId)}
                              </span>
                              {barrier.targetResolutionDate && (
                                <span data-testid={`barrier-target-date-${barrier.id}`}>
                                  <strong>Target:</strong> {format(new Date(barrier.targetResolutionDate), "MMM dd, yyyy")}
                                </span>
                              )}
                              <span data-testid={`barrier-severity-text-${barrier.id}`}>
                                <strong>Severity:</strong> {barrier.severity.charAt(0).toUpperCase() + barrier.severity.slice(1)}
                              </span>
                            </div>
                            {(barrier.status === "resolved" || barrier.status === "closed") && barrier.resolutionNotes && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-900 dark:text-green-100">
                                  <strong>Resolution:</strong> {barrier.resolutionNotes}
                                </p>
                              </div>
                            )}
                          </div>
                          {!isViewOnly && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(barrier)}
                                data-testid={`button-edit-barrier-${barrier.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(barrier.id)}
                                data-testid={`button-delete-barrier-${barrier.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  data-testid="button-close-barriers-modal"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {(viewMode === "add" || viewMode === "edit") && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {viewMode === "add" ? "Add New Barrier" : "Edit Barrier"}
                  </h3>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barrier Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief summary of the barrier"
                            {...field}
                            data-testid="input-barrier-title"
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
                            placeholder="Detailed description of the barrier and its impact"
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-barrier-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-barrier-severity">
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded-full bg-green-500" />
                                  <span>Low</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                  <span>Medium</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500" />
                                  <span>High</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-barrier-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="mitigated">Mitigated</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "unassigned"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-barrier-owner">
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {(users as User[])?.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.email
                                  }
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
                      name="targetResolutionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Resolution Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-barrier-target-date"
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
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {(watchedStatus === "resolved" || watchedStatus === "closed") && (
                    <FormField
                      control={form.control}
                      name="resolutionNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe how this barrier was resolved..."
                              className="min-h-[80px]"
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-barrier-resolution-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewMode("list")}
                    disabled={createBarrierMutation.isPending || updateBarrierMutation.isPending}
                    data-testid="button-cancel-barrier-form"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBarrierMutation.isPending || updateBarrierMutation.isPending}
                    data-testid="button-submit-barrier-form"
                  >
                    {createBarrierMutation.isPending || updateBarrierMutation.isPending
                      ? "Saving..."
                      : viewMode === "add"
                      ? "Create Barrier"
                      : "Update Barrier"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Barrier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this barrier? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-barrier">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete-barrier"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
