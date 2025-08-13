import { useState } from "react";
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
} from "lucide-react";

export default function Settings() {
  const { currentRole, currentUser, setCurrentUser, canManageUsers } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [adminActiveTab, setAdminActiveTab] = useState("user-management");
  const [isDarkMode, setIsDarkMode] = useState(false);
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

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      // In a real app, this would update the user profile
      return Promise.resolve(userData);
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setCurrentUser(updatedUser);
    },
  });

  const handleProfileUpdate = (formData: FormData) => {
    const profileData = {
      id: currentUser?.id,
      name: formData.get('name') as string,
      initials: formData.get('initials') as string,
      role: currentUser?.role,
    };
    updateUserMutation.mutate(profileData);
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    // In a real app, this would update user roles via API
    toast({
      title: "Success", 
      description: "User role updated successfully",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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
                variant={activeTab.startsWith("user") ? "secondary" : "ghost"}
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
                          {currentUser?.initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" data-testid="button-change-photo">
                        Change Photo
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          name="name"
                          defaultValue={currentUser?.name || ''}
                          data-testid="input-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="initials">Initials</Label>
                        <Input 
                          id="initials" 
                          name="initials"
                          defaultValue={currentUser?.initials || ''}
                          maxLength={3}
                          data-testid="input-initials"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={currentUser?.role || 'leader'} disabled>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="leader">Leader</SelectItem>
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
              <TabsList className="grid grid-cols-3 w-full max-w-2xl">
                <TabsTrigger value="user-management" className="flex items-center space-x-2" data-testid="tab-admin-users">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">User Roles</span>
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
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      User Role Management
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      As an administrator, you can assign roles to control access permissions. 
                      Executives can edit all strategies and tactics, while leaders can only edit tactics assigned to them.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(users as any[])?.map((user: any) => (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                          data-testid={`admin-user-item-${user.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>{user.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white" data-testid="text-admin-user-name">{user.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{user.username}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {user.role === 'executive' ? 'Can edit all strategies & tactics' : 'Can edit assigned tactics only'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={
                              user.role === 'executive' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }>
                              {user.role === 'executive' ? 'Executive' : 'Leader'}
                            </Badge>
                            <Select 
                              value={user.role} 
                              onValueChange={(value) => handleUserRoleChange(user.id, value)}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-admin-user-role-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="executive">Executive</SelectItem>
                                <SelectItem value="leader">Leader</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                      
                      <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                        <Button variant="outline" className="w-full" data-testid="button-invite-user">
                          <User className="w-4 h-4 mr-2" />
                          Invite New User
                        </Button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Invite team members to join the strategic planning platform
                        </p>
                      </div>
                    </div>
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
    </div>
  );
}