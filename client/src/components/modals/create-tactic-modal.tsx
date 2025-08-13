import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTacticSchema, type InsertTactic } from "@shared/schema";
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
import { Calendar, Users, Target } from "lucide-react";

interface CreateTacticModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId?: string;
}

type User = {
  id: string;
  name: string;
  role: string;
};

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
};

export function CreateTacticModal({ isOpen, onClose, strategyId }: CreateTacticModalProps) {
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

  const form = useForm<InsertTactic>({
    resolver: zodResolver(insertTacticSchema),
    defaultValues: {
      title: "",
      description: "",
      strategyId: strategyId || "",
      kpi: "",
      kpiTracking: "",
      accountableLeaders: "[]",
      resourcesRequired: "",
      startDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: "NYS",
      progress: 0,
      createdBy: currentUser?.id || "",
    },
  });

  const createTacticMutation = useMutation({
    mutationFn: async (data: InsertTactic) => {
      const response = await apiRequest("POST", "/api/tactics", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Tactic created successfully",
      });
      form.reset();
      setSelectedLeaders([]);
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tactic",
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

  const onSubmit = (data: InsertTactic) => {
    // Ensure accountableLeaders is properly formatted
    const submitData = {
      ...data,
      accountableLeaders: JSON.stringify(selectedLeaders),
    };
    createTacticMutation.mutate(submitData);
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
            <span>Create New Strategy</span>
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
                    <FormLabel>Strategy Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter strategy title"
                        {...field}
                        data-testid="input-tactic-title"
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
                        placeholder="Describe this strategy and its objectives"
                        {...field}
                        data-testid="textarea-tactic-description"
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
                    <FormLabel>Framework *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-strategy">
                          <SelectValue placeholder="Select a strategic framework" />
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
                    <FormLabel>KPI *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Number of partnerships established"
                        {...field}
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
                        id={`leader-${user.id}`}
                        checked={selectedLeaders.includes(user.id)}
                        onCheckedChange={(checked) => handleLeaderChange(user.id, !!checked)}
                        data-testid={`checkbox-leader-${user.id}`}
                      />
                      <label 
                        htmlFor={`leader-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {user.name} ({user.role})
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
                          data-testid="input-start-date"
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
                          data-testid="input-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Status and Progress */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Progress (%)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-progress">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="25">25%</SelectItem>
                          <SelectItem value="50">50%</SelectItem>
                          <SelectItem value="75">75%</SelectItem>
                          <SelectItem value="100">100%</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                disabled={createTacticMutation.isPending || selectedLeaders.length === 0}
                data-testid="button-create-tactic"
              >
                {createTacticMutation.isPending ? "Creating..." : "Create Tactic"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}