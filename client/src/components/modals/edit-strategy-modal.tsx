import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStrategySchema, type InsertStrategy, type Strategy } from "@shared/schema";
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
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null;
}

export function EditStrategyModal({ open, onOpenChange, strategy }: EditStrategyModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertStrategy>({
    resolver: zodResolver(insertStrategySchema),
    defaultValues: {
      title: "",
      description: "",
      goal: "",
      startDate: new Date(),
      targetDate: new Date(),
      metrics: "",
      status: "active",
      colorCode: "#3B82F6",
      createdBy: currentUser?.id || "",
      continuumField1: "",
      continuumField2: "",
      continuumField3: "",
      continuumField4: "",
      continuumField5: "",
    },
  });

  const predefinedColors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Red", value: "#EF4444" },
    { name: "Pink", value: "#EC4899" },
    { name: "Teal", value: "#14B8A6" },
    { name: "Indigo", value: "#6366F1" },
  ];

  // Update form when strategy changes
  useEffect(() => {
    if (strategy && open) {
      form.reset({
        title: strategy.title,
        description: strategy.description,
        goal: strategy.goal || "",
        startDate: new Date(strategy.startDate),
        targetDate: new Date(strategy.targetDate),
        metrics: strategy.metrics,
        status: strategy.status,
        colorCode: strategy.colorCode,
        createdBy: strategy.createdBy,
        continuumField1: strategy.continuumField1 || "",
        continuumField2: strategy.continuumField2 || "",
        continuumField3: strategy.continuumField3 || "",
        continuumField4: strategy.continuumField4 || "",
        continuumField5: strategy.continuumField5 || "",
      });
    }
  }, [strategy, open, form]);

  const updateStrategyMutation = useMutation({
    mutationFn: async (data: InsertStrategy) => {
      if (!strategy) throw new Error("No strategy to update");
      const response = await apiRequest("PATCH", `/api/strategies/${strategy.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Strategy updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Strategy update error:", error);
      toast({
        title: "Error", 
        description: "Failed to update strategy",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertStrategy) => {
    updateStrategyMutation.mutate(data);
  };

  if (!strategy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Strategy</DialogTitle>
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
                      <FormLabel>Strategy Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter strategy title..." {...field} data-testid="input-edit-strategy-title" />
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
                          placeholder="Describe the strategy..." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-edit-strategy-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategic Goal</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Increase revenue by 25%" {...field} value={field.value || ""} data-testid="input-edit-strategy-goal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Timeline</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-edit-start-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick start date</span>
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
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-edit-target-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick target date</span>
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
                                date < new Date("1900-01-01")
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

              {/* Metrics and Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Metrics & Status</h3>
                
                <FormField
                  control={form.control}
                  name="metrics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Success Metrics *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 25% revenue increase, 3 new markets" 
                          {...field} 
                          data-testid="input-edit-strategy-metrics"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-strategy-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Color Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance</h3>
                
                <FormField
                  control={form.control}
                  name="colorCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Color</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => field.onChange(color.value)}
                                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                  field.value === color.value
                                    ? 'border-gray-900 dark:border-white scale-110'
                                    : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                                data-testid={`color-${color.value}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="color"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                              data-testid="input-custom-color"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              or choose a custom color
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Change Continuum */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium">Change Continuum (Required)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  These fields will be customizable. For now, please provide information for all five fields.
                </p>

                <FormField
                  control={form.control}
                  name="continuumField1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Continuum Field 1 *</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Enter information for field 1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="continuumField2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Continuum Field 2 *</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Enter information for field 2"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="continuumField3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Continuum Field 3 *</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Enter information for field 3"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="continuumField4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Continuum Field 4 *</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Enter information for field 4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="continuumField5"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Continuum Field 5 *</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Enter information for field 5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit-strategy"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateStrategyMutation.isPending}
                data-testid="button-save-strategy"
              >
                {updateStrategyMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}