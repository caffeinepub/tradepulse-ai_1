import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart2,
  LineChart,
  LogIn,
  LogOut,
  Menu,
  TrendingUp,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function Navbar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { identity, clear, isInitializing } = useInternetIdentity();
  const isAuthed = !!identity;
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    {
      to: "/" as const,
      label: "Home",
      ocid: "nav.home_link",
      icon: TrendingUp,
    },
    {
      to: "/dashboard" as const,
      label: "Dashboard",
      ocid: "nav.dashboard_link",
      icon: BarChart2,
    },
    {
      to: "/analytics" as const,
      label: "Analytics",
      ocid: "nav.analytics_link",
      icon: LineChart,
    },
    ...(isAuthed
      ? [
          {
            to: "/profile" as const,
            label: "Profile",
            ocid: "nav.profile_link",
            icon: User,
          },
        ]
      : []),
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <nav className="flex items-center justify-between px-4 h-14 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-primary/20 border border-primary/40 flex items-center justify-center glow-buy">
            <TrendingUp className="w-4 h-4 text-buy" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">
            Trade<span className="text-buy">Pulse</span>{" "}
            <span className="text-muted-foreground font-normal text-xs">
              AI
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              data-ocid={link.ocid}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                pathname === link.to
                  ? "text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth controls */}
        <div className="hidden md:flex items-center gap-2">
          {isInitializing ? null : isAuthed ? (
            <>
              <span className="text-xs text-muted-foreground font-mono-num truncate max-w-[120px]">
                {identity?.getPrincipal().toString().slice(0, 12)}…
              </span>
              <Button
                size="sm"
                variant="ghost"
                data-ocid="nav.logout_button"
                onClick={clear}
                className="text-muted-foreground hover:text-destructive gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button
                  size="sm"
                  variant="ghost"
                  data-ocid="nav.login_button"
                  className="gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  data-ocid="nav.register_button"
                  className="gap-1.5 bg-primary/20 border border-primary/40 text-buy hover:bg-primary/30"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    data-ocid={link.ocid}
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
                      pathname === link.to
                        ? "text-foreground bg-secondary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="border-t border-border mt-2 pt-2 flex flex-col gap-1">
                {isAuthed ? (
                  <button
                    type="button"
                    data-ocid="nav.logout_button"
                    onClick={() => {
                      clear();
                      setMenuOpen(false);
                    }}
                    className="px-3 py-2 text-sm text-destructive hover:bg-secondary rounded flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)}>
                      <button
                        type="button"
                        data-ocid="nav.login_button"
                        className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded flex items-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </button>
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}>
                      <button
                        type="button"
                        data-ocid="nav.register_button"
                        className="w-full px-3 py-2 text-sm text-buy hover:bg-secondary rounded flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Register
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
