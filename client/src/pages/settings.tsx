import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Users,
  Trash2,
  Save,
  Moon,
  Sun,
  Globe,
  GripVertical,
  Target,
  ChevronDown,
} from "lucide-react";

interface UserStrategyRowProps {
  user: any;
  strategies: any[];
  onRoleChange: (userId: string, newRole: string) => void;
  onStrategyToggle: (userId: string, strategyId: string, isAssigned: boolean) => void;
}

function UserStrategyRow({ user, strategies, onRoleChange, onStrategyToggle }: UserStrategyRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: userAssignments } = useQuery({
    queryKey: [`/api/users/${user.id}/strategy-assignments`],
    enabled: user.role !== 'administrator',
  });

  const assignedStrategyIds = React.useMemo(() => {
    if (user.role === 'administrator') return [];
    return (userAssignments as any[] || []).map((a: any) => a.strategyId);
  }, [userAssignments, user.role]);

  const assignedCount = user.role === 'administrator' 
    ? strategies?.length || 0 
    : assignedStrategyIds.length;

  return (
    <div 
      className="flex flex-col p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      data-testid={`admin-user-item-${user.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {user.firstName?.[0] || user.lastName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white" data-testid="text-admin-user-name">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.email || 'Unknown User'
              }
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {user.role === 'administrator' 
                ? 'Full modification power over the app'
                : user.role === 'co_lead' 
                  ? 'Can edit tactics and actions for assigned strategies'
                  : user.role === 'sme'
                    ? 'Subject Matter Expert - Tracking only, cannot log in'
                    : 'View-only access to assigned strategies'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={
            user.role === 'administrator'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : user.role === 'co_lead' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                : user.role === 'sme'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }>
            {user.role === 'administrator' ? 'Administrator' : user.role === 'co_lead' ? 'Co-Lead' : user.role === 'sme' ? 'SME' : 'View'}
          </Badge>
          <Select 
            value={user.role} 
            onValueChange={(value) => onRoleChange(user.id, value)}
          >
            <SelectTrigger className="w-32" data-testid={`select-admin-user-role-${user.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="co_lead">Co-Lead</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="sme">SME (No Login)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {user.role !== 'administrator' && user.role !== 'sme' && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Assigned Strategies</Label>
              <Badge variant="outline" className="text-xs">
                {assignedCount} of {strategies?.length || 0}
              </Badge>
            </div>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid={`button-assign-strategies-${user.id}`}
                >
                  Manage Assignments
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Select Strategies</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Choose which strategies this user can access
                    </p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {strategies?.map((strategy: any) => {
                      const isAssigned = assignedStrategyIds.includes(strategy.id);
                      return (
                        <div 
                          key={strategy.id} 
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                        >
                          <Checkbox
                            id={`${user.id}-${strategy.id}`}
                            checked={isAssigned}
                            onCheckedChange={() => onStrategyToggle(user.id, strategy.id, isAssigned)}
                            data-testid={`checkbox-strategy-${strategy.id}-${user.id}`}
                          />
                          <label
                            htmlFor={`${user.id}-${strategy.id}`}
                            className="flex-1 text-sm cursor-pointer flex items-center space-x-2"
                          >
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: strategy.colorCode }}
                            />
                            <span>{strategy.title}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {assignedCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {strategies
                ?.filter((s: any) => assignedStrategyIds.includes(s.id))
                .map((strategy: any) => (
                  <Badge 
                    key={strategy.id}
                    variant="secondary"
                    className="text-xs"
                    style={{ borderLeft: `3px solid ${strategy.colorCode}` }}
                  >
                    {strategy.title}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { currentRole, currentUser, setCurrentUser, canManageUsers } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [adminActiveTab, setAdminActiveTab] = useState("user-management");
  const [frameworkOrder, setFrameworkOrder] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    strategic: true,
    tactical: true,
    deadlines: true,
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  // Initialize framework order when strategies load
  React.useEffect(() => {
    if (strategies) {
      const sortedStrategies = [...(strategies as any[])]
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setFrameworkOrder(sortedStrategies);
    }
  }, [strategies]);

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("PATCH", `/api/users/${userData.id}`, userData);
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setCurrentUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const reorderFrameworksMutation = useMutation({
    mutationFn: async (strategyOrders: { id: string; displayOrder: number }[]) => {
      await apiRequest("POST", "/api/strategies/reorder", { strategyOrders });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Framework order updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update framework order",
        variant: "destructive",
      });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: { firstName: string; lastName: string; email: string }) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User added successfully. They can now sign in with Replit Auth.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserDialogOpen(false);
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (formData: FormData) => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "User ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const profileData = {
      id: currentUser.id,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: currentUser.email, // Keep existing email
      role: currentUser.role, // Keep existing role
    };
    updateUserMutation.mutate(profileData);
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest("PATCH", `/api/users/${userId}`, { role: newRole });
      toast({
        title: "Success", 
        description: "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    try {
      await apiRequest("DELETE", `/api/strategies/${strategyId}`);
      toast({
        title: "Success",
        description: "Strategy deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    }
  };

  const moveFramework = (fromIndex: number, toIndex: number) => {
    const updatedOrder = [...frameworkOrder];
    const [movedItem] = updatedOrder.splice(fromIndex, 1);
    updatedOrder.splice(toIndex, 0, movedItem);
    setFrameworkOrder(updatedOrder);
  };

  const saveFrameworkOrder = () => {
    const strategyOrders = frameworkOrder.map((framework, index) => ({
      id: framework.id,
      displayOrder: index
    }));
    reorderFrameworksMutation.mutate(strategyOrders);
  };

  const assignStrategyMutation = useMutation({
    mutationFn: async ({ userId, strategyId }: { userId: string; strategyId: string }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/strategy-assignments`, { strategyId });
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.userId}/strategy-assignments`] });
      toast({
        title: "Success",
        description: "Strategy assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign strategy",
        variant: "destructive",
      });
    },
  });

  const unassignStrategyMutation = useMutation({
    mutationFn: async ({ userId, strategyId }: { userId: string; strategyId: string }) => {
      await apiRequest("DELETE", `/api/users/${userId}/strategy-assignments/${strategyId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.userId}/strategy-assignments`] });
      toast({
        title: "Success",
        description: "Strategy unassigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unassign strategy",
        variant: "destructive",
      });
    },
  });

  const handleStrategyAssignmentToggle = async (userId: string, strategyId: string, isAssigned: boolean) => {
    if (isAssigned) {
      unassignStrategyMutation.mutate({ userId, strategyId });
    } else {
      assignStrategyMutation.mutate({ userId, strategyId });
    }
  };

  const handleAddUser = () => {
    if (!newUserFirstName.trim() || !newUserLastName.trim() || !newUserEmail.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    addUserMutation.mutate({
      firstName: newUserFirstName,
      lastName: newUserLastName,
      email: newUserEmail,
    });
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    toast({
      title: "Theme Updated",
      description: `Switched to ${!isDarkMode ? 'dark' : 'light'} mode`,
    });
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {!activeTab.startsWith("admin") 
                  ? "Manage your personal preferences and profile settings"
                  : "Manage organization-wide settings and user permissions"
                }
              </p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Settings Layer Selector */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={!activeTab.startsWith("admin") ? "secondary" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className="flex-1"
                data-testid="button-user-settings"
              >
                <User className="w-4 h-4 mr-2" />
                User Settings
              </Button>
              {canManageUsers() && (
                <Button
                  variant={activeTab.startsWith("admin") ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("admin-user-management")}
                  className="flex-1"
                  data-testid="button-admin-settings"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Administrator Settings
                </Button>
              )}
            </div>
          </div>

          {/* User Settings */}
          {!activeTab.startsWith("admin") && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full max-w-2xl">
                <TabsTrigger value="profile" className="flex items-center space-x-2" data-testid="tab-profile">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2" data-testid="tab-notifications">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center space-x-2" data-testid="tab-appearance">
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
              </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card data-testid="card-profile">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleProfileUpdate(formData);
                  }} className="space-y-4">
                    <div className="flex items-center space-x-6">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-lg">
                          {currentUser?.firstName?.[0] || currentUser?.lastName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" data-testid="button-change-photo">
                        Change Photo
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          name="firstName"
                          defaultValue={currentUser?.firstName || ''}
                          data-testid="input-firstName"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          name="lastName"
                          defaultValue={currentUser?.lastName || ''}
                          data-testid="input-lastName"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email"
                        value={currentUser?.email || ''}
                        disabled
                        data-testid="input-email"
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                      <p className="text-sm text-gray-500">
                        Email is managed by your Replit account
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={currentUser?.role || 'co_lead'} disabled>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administrator">Administrator</SelectItem>
                          <SelectItem value="co_lead">Co-Lead</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Role changes must be made by an administrator
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateUserMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="space-y-6">
              <Card data-testid="card-notifications">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch 
                        id="email-notifications"
                        checked={notifications.email}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, email: checked }))
                        }
                        data-testid="switch-email-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Browser push notifications
                        </p>
                      </div>
                      <Switch 
                        id="push-notifications"
                        checked={notifications.push}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, push: checked }))
                        }
                        data-testid="switch-push-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="strategic-notifications">Strategic Updates</Label>
                        <p className="text-sm text-gray-500">
                          Strategy creation and milestone updates
                        </p>
                      </div>
                      <Switch 
                        id="strategic-notifications"
                        checked={notifications.strategic}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, strategic: checked }))
                        }
                        data-testid="switch-strategic-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="tactical-notifications">Tactical Updates</Label>
                        <p className="text-sm text-gray-500">
                          Tactic assignments and progress updates
                        </p>
                      </div>
                      <Switch 
                        id="tactical-notifications"
                        checked={notifications.tactical}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, tactical: checked }))
                        }
                        data-testid="switch-tactical-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="deadline-notifications">Deadline Alerts</Label>
                        <p className="text-sm text-gray-500">
                          Upcoming deadlines and overdue items
                        </p>
                      </div>
                      <Switch 
                        id="deadline-notifications"
                        checked={notifications.deadlines}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, deadlines: checked }))
                        }
                        data-testid="switch-deadline-notifications"
                      />
                    </div>
                  </div>

                  <Button data-testid="button-save-notifications">
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance */}
            <TabsContent value="appearance" className="space-y-6">
              <Card data-testid="card-appearance">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-5 w-5" />
                    Appearance Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <p className="text-sm text-gray-500">
                        Toggle dark mode interface
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <Switch 
                        id="dark-mode"
                        checked={isDarkMode}
                        onCheckedChange={toggleTheme}
                        data-testid="switch-dark-mode"
                      />
                      <Moon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern (EST)</SelectItem>
                        <SelectItem value="pst">Pacific (PST)</SelectItem>
                        <SelectItem value="gmt">GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            </Tabs>
          )}

          {/* Administrator Settings */}
          {canManageUsers() && activeTab.startsWith("admin") && (
            <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full max-w-3xl">
                <TabsTrigger value="user-management" className="flex items-center space-x-2" data-testid="tab-admin-users">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">User Roles</span>
                </TabsTrigger>
                <TabsTrigger value="framework-management" className="flex items-center space-x-2" data-testid="tab-admin-frameworks">
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Framework Order</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center space-x-2" data-testid="tab-admin-security">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="data" className="flex items-center space-x-2" data-testid="tab-admin-data">
                  <SettingsIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Data Management</span>
                </TabsTrigger>
              </TabsList>

              {/* Administrator User Management */}
              <TabsContent value="user-management" className="space-y-6">
                <Card data-testid="card-admin-user-management">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Users className="mr-2 h-5 w-5" />
                          User Role Management
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Add users by name and email to grant them access. Only approved users can sign in with Replit Auth.
                        </p>
                      </div>
                      <Button onClick={() => setIsAddUserDialogOpen(true)} data-testid="button-add-user">
                        <User className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(users as any[])?.map((user: any) => (
                        <UserStrategyRow
                          key={user.id}
                          user={user}
                          strategies={strategies as any[]}
                          onRoleChange={handleUserRoleChange}
                          onStrategyToggle={handleStrategyAssignmentToggle}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Strategy Management */}
              <TabsContent value="framework-management" className="space-y-6">
                <Card data-testid="card-admin-framework-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="mr-2 h-5 w-5" />
                      Strategy Priority Order
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Set the display order for your strategies. The order you set here will be reflected 
                      across all pages including Dashboard, Strategies, Projects, and Actions. This helps establish 
                      organizational priority and focus for your strategic initiatives.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {frameworkOrder.map((framework, index) => (
                        <div 
                          key={framework.id} 
                          className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 transition-colors"
                          data-testid={`framework-item-${framework.id}`}
                          style={{ borderLeft: `4px solid ${framework.colorCode}` }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: framework.colorCode }}
                              />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{framework.title}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {framework.description.substring(0, 80)}...
                              </p>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Priority #{index + 1} • {framework.status}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFramework(index, Math.max(0, index - 1))}
                              disabled={index === 0}
                              data-testid={`button-move-up-${framework.id}`}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFramework(index, Math.min(frameworkOrder.length - 1, index + 1))}
                              disabled={index === frameworkOrder.length - 1}
                              data-testid={`button-move-down-${framework.id}`}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {frameworkOrder.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No strategic frameworks found.</p>
                          <p className="text-sm">Create frameworks on the Framework page to manage their display order.</p>
                        </div>
                      )}
                    </div>
                    
                    {frameworkOrder.length > 0 && (
                      <div className="mt-6 pt-4 border-t dark:border-gray-700">
                        <Button 
                          onClick={saveFrameworkOrder}
                          disabled={reorderFrameworksMutation.isPending}
                          data-testid="button-save-framework-order"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {reorderFrameworksMutation.isPending ? 'Saving...' : 'Save Framework Order'}
                        </Button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Changes will be reflected across Dashboard, Framework, Strategies, and Outcomes pages.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Administrator Security */}
              <TabsContent value="security" className="space-y-6">
                <Card data-testid="card-admin-security">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="mr-2 h-5 w-5" />
                      Security & Access Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200">
                            Security Status: Good
                          </span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          All security measures are active and up to date
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Organization Password Policy</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>• Minimum 8 characters required</p>
                          <p>• Must include uppercase and lowercase letters</p>
                          <p>• Must include at least one number</p>
                          <p>• Must include at least one special character</p>
                        </div>
                        <Button variant="outline" data-testid="button-admin-change-policy">
                          Update Password Policy
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Session Management</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Control user session timeouts and security settings
                        </p>
                        <div className="flex space-x-2">
                          <Button variant="outline" data-testid="button-admin-session-settings">
                            Session Settings
                          </Button>
                          <Button variant="outline" data-testid="button-admin-force-logout">
                            Force All Logout
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Administrator Data Management */}
              <TabsContent value="data" className="space-y-6">
                <Card data-testid="card-admin-data-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <SettingsIcon className="mr-2 h-5 w-5" />
                      Organization Data Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Strategy Cleanup</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Remove completed or outdated strategies to keep the organization's workspace clean.
                        </p>
                        <div className="space-y-2">
                          {(strategies as any[])?.filter((s: any) => s.status === 'completed').map((strategy: any) => (
                            <div key={strategy.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <span className="text-sm">{strategy.title}</span>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" data-testid={`button-admin-delete-strategy-${strategy.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{strategy.title}"? This action cannot be undone and will affect all associated tactics.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStrategy(strategy.id)}>
                                      Delete Strategy
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Organization Data Export</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Export all organizational strategic planning data for backup, compliance, or analysis.
                        </p>
                        <div className="flex space-x-2">
                          <Button variant="outline" data-testid="button-admin-export-strategies">
                            Export All Strategies
                          </Button>
                          <Button variant="outline" data-testid="button-admin-export-tactics">
                            Export All Tactics
                          </Button>
                          <Button variant="outline" data-testid="button-admin-export-everything">
                            Complete Data Export
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                        <h4 className="font-medium mb-2 text-red-800 dark:text-red-200">Danger Zone</h4>
                        <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                          These actions are permanent and cannot be undone.
                        </p>
                        <Button variant="destructive" data-testid="button-admin-reset-all">
                          Reset All Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      {/* Add User Dialog */}
      <AlertDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New User</AlertDialogTitle>
            <AlertDialogDescription>
              Add a user by name and email. They will be able to sign in with Replit Auth using this email address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={newUserFirstName}
                onChange={(e) => setNewUserFirstName(e.target.value)}
                placeholder="Enter first name"
                data-testid="input-new-user-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={newUserLastName}
                onChange={(e) => setNewUserLastName(e.target.value)}
                placeholder="Enter last name"
                data-testid="input-new-user-last-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                data-testid="input-new-user-email"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddUser}
              disabled={addUserMutation.isPending}
              data-testid="button-confirm-add-user"
            >
              {addUserMutation.isPending ? "Adding..." : "Add User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}