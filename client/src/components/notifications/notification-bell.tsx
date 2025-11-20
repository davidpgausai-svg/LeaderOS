import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Notification } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface NotificationBellProps {
  isCollapsed?: boolean;
}

export function NotificationBell({ isCollapsed = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications with polling (every 30 seconds)
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Count unread notifications
  const unreadCount = notifications.filter(n => n.isRead === "false").length;

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark notification as unread mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/notifications/${id}/unread`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    // Toggle read/unread status
    if (notification.isRead === "false") {
      markAsReadMutation.mutate(notification.id);
    } else {
      markAsUnreadMutation.mutate(notification.id);
    }
  };

  const getNotificationTypeColor = (type: string) => {
    if (type.includes("completed") || type.includes("achieved")) {
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    }
    if (type.includes("overdue")) {
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    }
    if (type.includes("due")) {
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    }
    if (type.includes("progress")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    }
    if (type.includes("assigned")) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const buttonContent = (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center w-full ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2 text-sm font-medium rounded-md transition-colors ${
        isOpen
          ? "text-white bg-primary"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      data-testid="notification-bell-button"
    >
      <div className="relative">
        <Bell className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
            data-testid="notification-badge"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
      {!isCollapsed && <span>Notifications</span>}
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="right">
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </TooltipContent>
        </Tooltip>
      ) : (
        buttonContent
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute left-full ml-2 top-0 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
          data-testid="notification-dropdown"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                data-testid="mark-all-read-button"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                      notification.isRead === "false" ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {notification.isRead === "false" && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${getNotificationTypeColor(notification.type)}`}>
                            {notification.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(notification.createdAt || ""), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 flex-shrink-0"
                        data-testid={`delete-notification-${notification.id}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {Math.min(notifications.length, 20)} of {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
