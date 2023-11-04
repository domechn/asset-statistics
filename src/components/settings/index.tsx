import _ from "lodash";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import "./index.css";

import "./index.css";
import { SidebarNav } from "./sidebar-nav";
import { Outlet, Navigate, useLocation } from "react-router-dom";

const sidebarNavItems = [
  {
    title: "Configuration",
    href: "/settings/configuration",
  },
  {
    title: "Data",
    href: "/settings/data",
  },
];

const App = () => {
  const [version, setVersion] = useState<string>("0.1.0");
  const lo = useLocation();
  useEffect(() => {
    loadVersion();
  }, []);

  function loadVersion() {
    getVersion().then((ver) => {
      setVersion(ver);
    });
  }

  return (
    <div className="hidden space-y-6 p-10 pb-16 md:block">
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div>{version}</div>
        <div className="flex-1 lg:max-w-2xl">
          <Outlet></Outlet>
          {lo.pathname === "/settings" && (
            <Navigate to="/settings/configuration" />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
