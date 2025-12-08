import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Coins,
  History,
  Shield,
  LogOut,
  ChevronDown,
  Menu,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KycBadge, FrozenBadge, RoleBadge } from "@/components/status-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

const investorNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingCart },
  { href: "/kyc", label: "KYC Status", icon: UserCircle },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/assets", label: "Assets", icon: Package },
  { href: "/admin/tokens", label: "Tokens", icon: Coins },
  { href: "/admin/audit", label: "Audit Log", icon: History },
];

function NavItems({ items, isAdmin }: { items: typeof investorNavItems; isAdmin?: boolean }) {
  const [location] = useLocation();

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const isActive = location === item.href || 
          (item.href !== "/admin" && item.href !== "/dashboard" && location.startsWith(item.href));
        
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "gap-2 font-medium",
                isActive && "bg-accent"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ items }: { items: typeof investorNavItems }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const isActive = location === item.href || 
          (item.href !== "/admin" && item.href !== "/dashboard" && location.startsWith(item.href));
        
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 font-medium",
                isActive && "bg-accent"
              )}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore();
  const [, setLocation] = useLocation();

  if (!user) {
    return <>{children}</>;
  }

  const isAdmin = user.role === "ADMIN";
  const navItems = isAdmin ? adminNavItems : investorNavItems;

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {user.isFrozen && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Your account has been frozen. You cannot perform any transactions until it is unfrozen by an administrator.
          </AlertDescription>
        </Alert>
      )}

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex items-center gap-2 p-4 border-b">
                    <div className="rounded-lg bg-primary p-2">
                      <Shield className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-semibold">TokenVault</span>
                  </div>
                  <MobileNav items={navItems} />
                </SheetContent>
              </Sheet>

              <Link href={isAdmin ? "/admin" : "/dashboard"}>
                <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
                  <div className="rounded-lg bg-primary p-2">
                    <Shield className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold hidden sm:inline">TokenVault</span>
                </div>
              </Link>

              <div className="hidden md:flex">
                <NavItems items={navItems} isAdmin={isAdmin} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start text-left">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <RoleBadge role={user.role} />
                      <KycBadge status={user.kycStatus} />
                      <FrozenBadge isFrozen={user.isFrozen} />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
