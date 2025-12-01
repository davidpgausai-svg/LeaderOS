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
  FileText,
  Plus,
  Link,
  RefreshCw,
  Copy,
  Check,
  Building2,
} from "lucide-react";
import type { TemplateType, Organization } from "@shared/schema";

interface UserStrategyRowProps {
  user: any;
  strategies: any[];
  currentUserId: string;
  onRoleChange: (userId: string, newRole: string) => void;
  onStrategyToggle: (userId: string, strategyId: string, isAssigned: boolean) => void;
  onDelete: (userId: string, userName: string) => void;
}

function UserStrategyRow({ user, strategies, currentUserId, onRoleChange, onStrategyToggle, onDelete }: UserStrategyRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: userAssignments } = useQuery({
    queryKey: [`/api/users/${user.id}/strategy-assignments`],
    enabled: user.role !== 'administrator',
  });

  const assignedStrategyIds = React.useMemo(() => {
    if (user.role === 'administrator') return [];
    // Deduplicate strategy IDs to prevent counting duplicates
    const strategyIds = (userAssignments as any[] || []).map((a: any) => a.strategyId);
    return Array.from(new Set(strategyIds));
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
          
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={user.id === currentUserId}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                data-testid={`button-delete-user-${user.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(user.id, user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'this user')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
  const { currentRole, currentUser, setCurrentUser, canManageUsers, isSuperAdmin } = useRole();
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
  const [newTemplateTypeName, setNewTemplateTypeName] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [copiedOrgToken, setCopiedOrgToken] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: templateTypes = [] } = useQuery<TemplateType[]>({
    queryKey: ["/api/template-types"],
  });

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/super-admin/organizations"],
    enabled: isSuperAdmin(),
  });

  // Initialize framework order when strategies load
  React.useEffect(() => {
    if (strategies) {
      const sortedStrategies = [...(strategies as any[])]
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setFrameworkOrder(sortedStrategies);
    }
  }, [strategies]);

  // Fetch registration token when admin security tab is active
  React.useEffect(() => {
    if (adminActiveTab === "security" && canManageUsers() && !registrationToken) {
      fetchRegistrationToken();
    }
  }, [adminActiveTab]);

  const fetchRegistrationToken = async () => {
    setIsLoadingToken(true);
    try {
      const response = await apiRequest("GET", "/api/admin/registration-token");
      const data = await response.json();
      setRegistrationToken(data.token);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch registration token",
        variant: "destructive",
      });
    } finally {
      setIsLoadingToken(false);
    }
  };

  const rotateRegistrationToken = async () => {
    setIsRotatingToken(true);
    try {
      const response = await apiRequest("POST", "/api/admin/registration-token/rotate");
      const data = await response.json();
      setRegistrationToken(data.token);
      toast({
        title: "Success",
        description: "Registration link has been rotated. The old link is now invalid.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rotate registration token",
        variant: "destructive",
      });
    } finally {
      setIsRotatingToken(false);
    }
  };

  const copyRegistrationUrl = async () => {
    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/register/${registrationToken}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast({
        title: "Copied!",
        description: "Registration link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

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
        description: "User added successfully. Share the registration link with them to complete their account setup.",
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const createTemplateTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/template-types", { name });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template category created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/template-types"] });
      setNewTemplateTypeName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template category",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/template-types/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template category deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/template-types"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template category",
        variant: "destructive",
      });
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/super-admin/organizations", { name });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      setNewOrgName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const deleteOrganizationMutation = useMutation({
    mutationFn: async (orgId: string) => {
      await apiRequest("DELETE", `/api/super-admin/organizations/${orgId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      });
    },
  });

  const rotateOrgTokenMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await apiRequest("POST", `/api/super-admin/organizations/${orgId}/rotate-token`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Registration token rotated. The old link is now invalid.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rotate registration token",
        variant: "destructive",
      });
    },
  });

  const copyOrgRegistrationUrl = async (token: string, orgName: string) => {
    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/register/${token}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopiedOrgToken(token);
      setTimeout(() => setCopiedOrgToken(null), 2000);
      toast({
        title: "Copied!",
        description: `Registration link for ${orgName} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleAddTemplateType = () => {
    const trimmedName = newTemplateTypeName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }
    
    const defaultCategories = ["Strategic Planning", "Project Management", "Daily Tasks"];
    const existingNames = [...defaultCategories, ...templateTypes.map(t => t.name.toLowerCase())];
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }
    
    createTemplateTypeMutation.mutate(trimmedName);
  };

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
      timezone: formData.get('timezone') as string,
    };
    updateUserMutation.mutate(profileData);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    deleteUserMutation.mutate(userId);
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
                        Email cannot be changed after registration
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

                    {currentRole === 'administrator' && (
                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" />
                          <span>Timezone</span>
                        </Label>
                        <Select 
                          name="timezone" 
                          defaultValue={currentUser?.timezone || 'America/Chicago'}
                        >
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                            <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                            <SelectItem value="America/Phoenix">Mountain Time - Arizona (MST)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                            <SelectItem value="America/Anchorage">Alaska Time (AKST/AKDT)</SelectItem>
                            <SelectItem value="Pacific/Honolulu">Hawaii-Aleutian Time (HST)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500">
                          Used to determine "today" on the Timeline
                        </p>
                      </div>
                    )}

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
              <TabsList className={`grid w-full max-w-3xl ${isSuperAdmin() ? 'grid-cols-5' : 'grid-cols-4'}`}>
                {isSuperAdmin() && (
                  <TabsTrigger value="organizations" className="flex items-center space-x-2" data-testid="tab-admin-organizations">
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Organizations</span>
                  </TabsTrigger>
                )}
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

              {/* Super Admin Organizations Management */}
              {isSuperAdmin() && (
                <TabsContent value="organizations" className="space-y-6">
                  <Card data-testid="card-admin-organizations">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center">
                            <Building2 className="mr-2 h-5 w-5" />
                            Organization Management
                          </CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Manage customer organizations. Each organization has its own isolated data and registration link.
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex gap-2 mb-4">
                        <Input
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="New organization name..."
                          className="max-w-xs"
                          onKeyDown={(e) => e.key === "Enter" && newOrgName.trim() && createOrganizationMutation.mutate(newOrgName.trim())}
                          data-testid="input-new-organization"
                        />
                        <Button
                          onClick={() => newOrgName.trim() && createOrganizationMutation.mutate(newOrgName.trim())}
                          disabled={createOrganizationMutation.isPending || !newOrgName.trim()}
                          data-testid="button-add-organization"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {createOrganizationMutation.isPending ? "Creating..." : "Create Organization"}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {organizations.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                            No organizations yet. Create one above.
                          </p>
                        ) : (
                          organizations.map((org: Organization) => (
                            <div
                              key={org.id}
                              className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 space-y-3"
                              data-testid={`org-item-${org.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Building2 className="h-5 w-5 text-gray-500" />
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">{org.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Created: {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                      data-testid={`button-delete-org-${org.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{org.name}"? This will permanently remove all associated users, strategies, projects, and actions. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteOrganizationMutation.mutate(org.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Organization
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>

                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Link className="h-4 w-4 text-blue-600" />
                                  <h5 className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                    Registration Link
                                  </h5>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    value={`${window.location.origin}/register/${org.registrationToken}`}
                                    readOnly
                                    className="font-mono text-xs bg-white dark:bg-gray-800"
                                    data-testid={`input-org-registration-url-${org.id}`}
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyOrgRegistrationUrl(org.registrationToken, org.name)}
                                    data-testid={`button-copy-org-url-${org.id}`}
                                  >
                                    {copiedOrgToken === org.registrationToken ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="text-orange-600"
                                        data-testid={`button-rotate-org-token-${org.id}`}
                                      >
                                        <RefreshCw className={`h-4 w-4 ${rotateOrgTokenMutation.isPending ? 'animate-spin' : ''}`} />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Rotate Registration Link?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will create a new registration link for "{org.name}" and immediately invalidate the old one. Anyone with the old link will no longer be able to register.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => rotateOrgTokenMutation.mutate(org.id)}
                                          className="bg-orange-600 hover:bg-orange-700"
                                        >
                                          Rotate Link
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

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
                          Manage user roles and strategy assignments. New users can register using the secret registration link found in the Security tab.
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
                          currentUserId={currentUser?.id || ''}
                          onRoleChange={handleUserRoleChange}
                          onStrategyToggle={handleStrategyAssignmentToggle}
                          onDelete={handleDeleteUser}
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
                      <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center space-x-2 mb-3">
                          <Link className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">
                            User Registration Link
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Share this secret link with people you want to grant access to the platform. 
                          The first person to register becomes an Administrator. All others become Co-Leads by default.
                        </p>
                        
                        {isLoadingToken ? (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Loading registration link...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center space-x-2 mb-4">
                              <Input
                                value={registrationToken ? `${window.location.origin}/register/${registrationToken}` : ''}
                                readOnly
                                className="font-mono text-sm bg-white dark:bg-gray-800"
                                data-testid="input-registration-url"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={copyRegistrationUrl}
                                disabled={!registrationToken}
                                data-testid="button-copy-registration-url"
                              >
                                {copiedToken ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950"
                                  disabled={isRotatingToken}
                                  data-testid="button-rotate-registration-token"
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${isRotatingToken ? 'animate-spin' : ''}`} />
                                  {isRotatingToken ? 'Rotating...' : 'Rotate Registration Link'}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rotate Registration Link?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will create a new registration link and immediately invalidate the old one. 
                                    Anyone with the old link will no longer be able to register.
                                    <br /><br />
                                    Use this if the registration link was shared with unauthorized users.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={rotateRegistrationToken}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    Rotate Link
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>

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
                        <h4 className="font-medium">Password Requirements</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>• Minimum 6 characters required</p>
                          <p>• Email must be a valid email address</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Session Management</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          User sessions expire after 7 days of inactivity
                        </p>
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

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Template Categories
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Manage custom template categories for the Templates page.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newTemplateTypeName}
                            onChange={(e) => setNewTemplateTypeName(e.target.value)}
                            placeholder="New category name..."
                            className="max-w-xs"
                            onKeyDown={(e) => e.key === "Enter" && handleAddTemplateType()}
                            data-testid="input-new-template-type"
                          />
                          <Button
                            onClick={handleAddTemplateType}
                            disabled={createTemplateTypeMutation.isPending}
                            data-testid="button-add-template-type"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {createTemplateTypeMutation.isPending ? "Adding..." : "Add"}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {templateTypes.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                              No custom template categories yet. Add one above.
                            </p>
                          ) : (
                            templateTypes.map((templateType: TemplateType) => (
                              <div
                                key={templateType.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {templateType.name}
                                  </span>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                      data-testid={`button-delete-template-type-${templateType.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Template Category</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the "{templateType.name}" category? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteTemplateTypeMutation.mutate(templateType.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))
                          )}
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
              Pre-register a user by name and email. They can then use the registration link (found in Security settings) to create their password and complete account setup.
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