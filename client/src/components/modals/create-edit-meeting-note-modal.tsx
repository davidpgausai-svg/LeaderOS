import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingNoteSchema, type InsertMeetingNote } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Calendar as CalendarIcon, Target, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateEditMeetingNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: any | null;
}

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
};

type Tactic = {
  id: string;
  title: string;
  strategyId: string;
};

type Outcome = {
  id: string;
  title: string;
  tacticId: string | null;
};

export function CreateEditMeetingNoteModal({ isOpen, onClose, note }: CreateEditMeetingNoteModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: outcomes } = useQuery({
    queryKey: ["/api/outcomes"],
  });

  const form = useForm<InsertMeetingNote>({
    resolver: zodResolver(insertMeetingNoteSchema),
    defaultValues: {
      title: "",
      meetingDate: new Date(),
      strategyId: "",
      selectedProjectIds: "[]",
      selectedActionIds: "[]",
      notes: "",
      createdBy: currentUser?.id || "",
    },
  });

  // Update form when note changes (edit mode)
  useEffect(() => {
    if (note && isOpen) {
      try {
        const projectIds = JSON.parse(note.selectedProjectIds || "[]");
        const actionIds = JSON.parse(note.selectedActionIds || "[]");
        
        setSelectedProjectIds(projectIds);
        setSelectedActionIds(actionIds);
        setSelectedStrategyId(note.strategyId);
        
        form.reset({
          title: note.title || "",
          meetingDate: new Date(note.meetingDate),
          strategyId: note.strategyId || "",
          selectedProjectIds: note.selectedProjectIds || "[]",
          selectedActionIds: note.selectedActionIds || "[]",
          notes: note.notes || "",
          createdBy: note.createdBy || currentUser?.id || "",
        });
      } catch (error) {
        console.error("Error parsing note data:", error);
      }
    } else if (!note && isOpen) {
      // Reset for create mode
      setSelectedProjectIds([]);
      setSelectedActionIds([]);
      setSelectedStrategyId("");
      form.reset({
        title: "",
        meetingDate: new Date(),
        strategyId: "",
        selectedProjectIds: "[]",
        selectedActionIds: "[]",
        notes: "",
        createdBy: currentUser?.id || "",
      });
    }
  }, [note, isOpen, form, currentUser]);

  const createMeetingNoteMutation = useMutation({
    mutationFn: async (data: InsertMeetingNote) => {
      const response = await apiRequest("POST", "/api/meeting-notes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      toast({
        title: "Success",
        description: "Meeting note created successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting note",
        variant: "destructive",
      });
    },
  });

  const updateMeetingNoteMutation = useMutation({
    mutationFn: async (data: InsertMeetingNote) => {
      const response = await apiRequest("PATCH", `/api/meeting-notes/${note.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      toast({
        title: "Success",
        description: "Meeting note updated successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update meeting note",
        variant: "destructive",
      });
    },
  });

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    // Reset projects and actions when strategy changes
    setSelectedProjectIds([]);
    setSelectedActionIds([]);
    form.setValue("strategyId", strategyId);
    form.setValue("selectedProjectIds", "[]");
    form.setValue("selectedActionIds", "[]");
  };

  const handleProjectChange = (projectId: string, checked: boolean) => {
    let newProjects: string[];
    if (checked) {
      newProjects = [...selectedProjectIds, projectId];
    } else {
      newProjects = selectedProjectIds.filter(id => id !== projectId);
      // Remove actions that belong to this project
      const actionsToRemove = (outcomes as Outcome[])
        ?.filter(outcome => outcome.tacticId === projectId)
        .map(outcome => outcome.id) || [];
      const newActions = selectedActionIds.filter(id => !actionsToRemove.includes(id));
      setSelectedActionIds(newActions);
      form.setValue("selectedActionIds", JSON.stringify(newActions));
    }
    setSelectedProjectIds(newProjects);
    form.setValue("selectedProjectIds", JSON.stringify(newProjects));
  };

  const handleActionChange = (actionId: string, checked: boolean) => {
    let newActions: string[];
    if (checked) {
      newActions = [...selectedActionIds, actionId];
    } else {
      newActions = selectedActionIds.filter(id => id !== actionId);
    }
    setSelectedActionIds(newActions);
    form.setValue("selectedActionIds", JSON.stringify(newActions));
  };

  const onSubmit = (data: InsertMeetingNote) => {
    const submitData = {
      ...data,
      selectedProjectIds: JSON.stringify(selectedProjectIds),
      selectedActionIds: JSON.stringify(selectedActionIds),
    };
    
    if (note) {
      updateMeetingNoteMutation.mutate(submitData);
    } else {
      createMeetingNoteMutation.mutate(submitData);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedProjectIds([]);
    setSelectedActionIds([]);
    setSelectedStrategyId("");
    onClose();
  };

  // Filter tactics by selected strategy
  const filteredTactics = (tactics as Tactic[])?.filter(
    tactic => tactic.strategyId === selectedStrategyId
  ) || [];

  // Filter outcomes by selected projects
  const filteredOutcomes = (outcomes as Outcome[])?.filter(
    outcome => outcome.tacticId && selectedProjectIds.includes(outcome.tacticId)
  ) || [];

  const isLoading = createMeetingNoteMutation.isPending || updateMeetingNoteMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span>{note ? "Edit Meeting Note" : "Create Meeting Note"}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter meeting title"
                      {...field}
                      data-testid="input-meeting-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting Date */}
            <FormField
              control={form.control}
              name="meetingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Meeting Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-meeting-date"
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
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        data-testid="calendar-meeting-date"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Strategy */}
            <FormField
              control={form.control}
              name="strategyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy *</FormLabel>
                  <Select
                    onValueChange={handleStrategyChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-strategy">
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

            {/* Projects - only show if strategy selected */}
            {selectedStrategyId && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-medium">Selected Projects</h3>
                </div>
                
                {filteredTactics.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No projects available for this strategy
                  </p>
                ) : (
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">
                    {filteredTactics.map((tactic) => (
                      <div key={tactic.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`project-${tactic.id}`}
                          checked={selectedProjectIds.includes(tactic.id)}
                          onCheckedChange={(checked) =>
                            handleProjectChange(tactic.id, checked as boolean)
                          }
                          data-testid={`checkbox-project-${tactic.id}`}
                        />
                        <label
                          htmlFor={`project-${tactic.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {tactic.title}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions - only show if at least one project selected */}
            {selectedProjectIds.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-medium">Selected Actions</h3>
                </div>
                
                {filteredOutcomes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No actions available for selected projects
                  </p>
                ) : (
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">
                    {filteredOutcomes.map((outcome) => (
                      <div key={outcome.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`action-${outcome.id}`}
                          checked={selectedActionIds.includes(outcome.id)}
                          onCheckedChange={(checked) =>
                            handleActionChange(outcome.id, checked as boolean)
                          }
                          data-testid={`checkbox-action-${outcome.id}`}
                        />
                        <label
                          htmlFor={`action-${outcome.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {outcome.title}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter meeting notes and discussion points"
                      className="min-h-[200px]"
                      {...field}
                      data-testid="textarea-meeting-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Saving..." : note ? "Update Meeting Note" : "Create Meeting Note"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
