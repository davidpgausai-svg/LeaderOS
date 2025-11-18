import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOutcomeSchema, type InsertOutcome, type Outcome } from "@shared/schema";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditOutcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outcome: Outcome | null;
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

export function EditOutcomeModal({ open, onOpenChange, outcome }: EditOutcomeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const form = useForm<InsertOutcome>({
    resolver: zodResolver(insertOutcomeSchema),
    defaultValues: {
      title: "",
      description: "",
      strategyId: "",
      tacticId: undefined,
      targetValue: "",
      currentValue: "",
      measurementUnit: "",
      status: "in_progress",
      dueDate: undefined,
      createdBy: "",
    },
  });

  // Update form when outcome changes
  useEffect(() => {
    if (outcome) {
      form.reset({
        title: outcome.title,
        description: outcome.description,
        strategyId: outcome.strategyId,
        tacticId: outcome.tacticId || undefined,
        targetValue: outcome.targetValue || "",
        currentValue: outcome.currentValue || "",
        measurementUnit: outcome.measurementUnit || "",
        status: outcome.status,
        dueDate: outcome.dueDate ? new Date(outcome.dueDate) : undefined,
        createdBy: outcome.createdBy,
      });
    }
  }, [outcome, form]);

  const updateOutcomeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertOutcome }) => {
      const response = await apiRequest("PATCH", `/api/outcomes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outcomes"] });
      toast({
        title: "Success",
        description: "Outcome updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update outcome",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertOutcome) => {
    if (!outcome) return;

    // Ensure strategyId is provided (required field)
    if (!data.strategyId || data.strategyId === "placeholder") {
      toast({
        title: "Error",
        description: "Please select a framework strategy",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty optional fields
    const cleanData: InsertOutcome = {
      ...data,
      tacticId: data.tacticId === "none" ? undefined : data.tacticId || undefined,
      targetValue: data.targetValue || undefined,
      currentValue: data.currentValue || undefined,
      measurementUnit: data.measurementUnit || undefined,
      dueDate: data.dueDate || undefined,
    };
    updateOutcomeMutation.mutate({ id: outcome.id, data: cleanData });
  };

  const selectedStrategy = form.watch("strategyId");
  const filteredTactics = (tactics as Tactic[])?.filter(tactic => 
    tactic.strategyId === selectedStrategy
  ) || [];

  if (!outcome) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Outcome</DialogTitle>
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
                      <FormLabel>Outcome Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter outcome title..." {...field} data-testid="input-edit-outcome-title" />
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
                          placeholder="Describe the expected outcome..." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-edit-outcome-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Strategy & Tactic Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Assignment</h3>
                
                <FormField
                  control={form.control}
                  name="strategyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Framework Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "placeholder"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-outcome-strategy">
                            <SelectValue placeholder="Select a framework strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="placeholder">Select a framework strategy</SelectItem>
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

                <FormField
                  control={form.control}
                  name="tacticId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Strategy (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "none"}
                        disabled={!selectedStrategy || filteredTactics.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-outcome-tactic">
                            <SelectValue placeholder="Select a related strategy (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific strategy</SelectItem>
                          {filteredTactics.map((tactic) => (
                            <SelectItem key={tactic.id} value={tactic.id}>
                              {tactic.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Measurement Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Measurement</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Value</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 100" {...field} value={field.value || ""} data-testid="input-edit-outcome-target" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Value</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 25" {...field} value={field.value || ""} data-testid="input-edit-outcome-current" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="measurementUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., %/units/dollars" {...field} value={field.value || ""} data-testid="input-edit-outcome-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            <SelectTrigger data-testid="select-edit-outcome-status">
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
                                data-testid="button-edit-outcome-due-date"
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
                data-testid="button-cancel-edit-outcome"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateOutcomeMutation.isPending}
                data-testid="button-update-outcome"
              >
                {updateOutcomeMutation.isPending ? "Updating..." : "Update Outcome"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
