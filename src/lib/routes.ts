export interface RouteConfig {
  path: string;
  label?: string;
  showInNav?: boolean;
  view?: "default" | "editor" | "dashboard";
}

export const routes: Record<string, RouteConfig> = {
  "/": { path: "/", label: "Home", showInNav: true },
  "/about": { path: "/about", label: "About", showInNav: true },
  "/pageEditor": {
    path: "/pageEditor",
    label: "Page Editor",
    showInNav: false,
    view: "editor",
  },
  "/dashboard": {
    path: "/dashboard",
    label: "Dashboard",
    showInNav: false,
    view: "dashboard",
  },
  "/case-study": { path: "/case-study", label: "Case Study", showInNav: false },
};

export const navRoutes = Object.entries(routes)
  .filter(([, route]) => route.showInNav)
  .map(([, route]) => route);