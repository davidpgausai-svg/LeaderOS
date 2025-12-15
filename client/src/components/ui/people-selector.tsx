import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  fte?: string | null;
};

interface PeopleSelectorProps {
  users: User[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  mode?: "single" | "multi";
  placeholder?: string;
  showRole?: boolean;
  showFte?: boolean;
  excludeUserIds?: string[];
  disabled?: boolean;
  className?: string;
  closeOnSelect?: boolean;
}

export function PeopleSelector({
  users,
  selectedUserIds,
  onChange,
  mode = "multi",
  placeholder = "Select people...",
  showRole = false,
  showFte = false,
  excludeUserIds = [],
  disabled = false,
  className,
  closeOnSelect = false,
}: PeopleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  const getUserDisplayName = (user: User): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email || "Unknown User";
  };

  const getUserInitials = (user: User): string => {
    const first = user.firstName?.[0] || user.email?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const formatRole = (role: string | null | undefined): string => {
    if (!role) return "";
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const availableUsers = users.filter(
    (user) => !excludeUserIds.includes(user.id)
  );

  const filteredUsers = availableUsers.filter((user) => {
    const searchLower = searchValue.toLowerCase();
    const fullName = getUserDisplayName(user).toLowerCase();
    const email = (user.email || "").toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const selectedUsers = users.filter((user) =>
    selectedUserIds.includes(user.id)
  );

  const handleSelect = (userId: string) => {
    if (mode === "single") {
      onChange([userId]);
      setOpen(false);
      setSearchValue("");
    } else {
      if (selectedUserIds.includes(userId)) {
        const newIds = selectedUserIds.filter((id) => id !== userId);
        onChange(newIds);
        if (closeOnSelect || newIds.length === 0) {
          setOpen(false);
        }
      } else {
        onChange([...selectedUserIds, userId]);
        if (closeOnSelect) {
          setOpen(false);
        }
      }
    }
  };

  const handleRemove = (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newIds = selectedUserIds.filter((id) => id !== userId);
    onChange(newIds);
    if (newIds.length === 0) {
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-[40px] h-auto",
            selectedUserIds.length > 0 && mode === "multi" && "py-1.5",
            className
          )}
          data-testid="people-selector-trigger"
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selectedUsers.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : mode === "single" ? (
              <span className="truncate">
                {getUserDisplayName(selectedUsers[0])}
                {showRole && selectedUsers[0].role && (
                  <span className="text-muted-foreground ml-1">
                    ({formatRole(selectedUsers[0].role)})
                  </span>
                )}
                {showFte && selectedUsers[0].fte && (
                  <span className="text-muted-foreground ml-1">
                    · FTE: {selectedUsers[0].fte}
                  </span>
                )}
              </span>
            ) : (
              selectedUsers.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="mr-1 mb-0.5 pr-1 flex items-center gap-1"
                >
                  <span className="truncate max-w-[150px]">
                    {getUserDisplayName(user)}
                  </span>
                  <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted"
                    onClick={(e) => handleRemove(user.id, e)}
                    data-testid={`remove-user-${user.id}`}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {getUserDisplayName(user)}</span>
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {selectedUserIds.length > 0 && mode === "multi" && (
              <button
                type="button"
                className="p-1 rounded-full hover:bg-muted"
                onClick={handleClear}
                data-testid="clear-all-users"
              >
                <X className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Clear all</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={searchValue}
            onValueChange={setSearchValue}
            data-testid="people-selector-search"
          />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user.id)}
                    className="cursor-pointer"
                    data-testid={`select-user-${user.id}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {getUserInitials(user)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {getUserDisplayName(user)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                          {showRole && user.role && (
                            <span className="ml-1">· {formatRole(user.role)}</span>
                          )}
                          {showFte && user.fte && (
                            <span className="ml-1">· FTE: {user.fte}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
