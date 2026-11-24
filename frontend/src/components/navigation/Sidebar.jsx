import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Code2,
  Users2,
  Terminal,
  Network,
  Video,
  FileBarChart2,
  TrendingUp,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  ListTodo,
  CheckCircle2,
} from "lucide-react";
import { useSidebar } from "../../context/SidebarContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";
import { Avatar } from "../ui/Avatar.jsx";

const NAVIGATION_GROUPS = [
  {
    group: "MAIN",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "My Preparations", path: "/preparations", icon: Briefcase },
    ],
  },
  {
    group: "PRACTICE",
    items: [
      { name: "Technical Practice", path: "/practice/technical", icon: Code2 },
      { name: "HR Practice", path: "/practice/hr", icon: Users2 },
      { name: "Coding Arena", path: "/coding", icon: Terminal },
      { name: "System Design", path: "/system-design", icon: Network },
    ],
  },
  {
    group: "INTERVIEWS",
    items: [
      {
        name: "Mock Interviews",
        path: "/mock-interviews",
        icon: Video,
        badge: "AI Live",
      },
      { name: "Interview Reports", path: "/reports", icon: FileBarChart2 },
    ],
  },
  {
    group: "ANALYTICS & PROGRESS",
    items: [
      { name: "Analytics", path: "/analytics", icon: BarChart3 },
      { name: "Skill Gaps", path: "/analytics/skill-gaps", icon: Target },
      { name: "Improvement Plan", path: "/improvement-plan", icon: TrendingUp },
      { name: "Learning Tasks", path: "/learning-tasks", icon: ListTodo },
      { name: "Progress", path: "/progress", icon: CheckCircle2 },
      { name: "History", path: "/history", icon: History },
    ],
  },
  {
    group: "PREFERENCES",
    items: [{ name: "Settings", path: "/settings", icon: Settings }],
  },
];

export function Sidebar() {
  const { isCollapsed, toggleCollapse } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0B1020] transition-all duration-300 select-none z-30 sticky top-0 h-screen ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header / Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-[#27324A]">
        <NavLink
          to="/dashboard"
          className="flex items-center space-x-3 overflow-hidden"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                InterviewAI
              </span>
              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold tracking-wider uppercase">
                Enterprise SaaS
              </span>
            </div>
          )}
        </NavLink>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed ? (
              <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                {group.group}
              </h4>
            ) : (
              <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-2" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/dashboard" &&
                  location.pathname.startsWith(item.path));

              const linkContent = (
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-violet-600 text-white shadow-sm shadow-violet-600/25 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  } ${isCollapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`}
                  />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-violet-500/10 text-violet-500 dark:text-violet-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );

              return isCollapsed ? (
                <Tooltip key={item.path} text={item.name} position="right">
                  {linkContent}
                </Tooltip>
              ) : (
                <div key={item.path}>{linkContent}</div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom User Quick Info (when not collapsed) */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-[#27324A] bg-slate-50/50 dark:bg-[#151C2E]/40 m-3 rounded-xl">
          <div className="flex items-center space-x-3">
            <Avatar
              initials={
                user?.name ? user.name.substring(0, 2).toUpperCase() : "AI"
              }
              size="sm"
              status="online"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.name || "Candidate"}
              </p>
              <p className="text-[11px] text-emerald-500 font-medium truncate flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>
                  {user?.isEmailVerified
                    ? "Verified Member"
                    : "Pending Verification"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
