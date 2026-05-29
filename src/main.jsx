import React from "react";
import { createRoot } from "react-dom/client";
import PasswordGate from "./features/auth/PasswordGate.jsx";

const backendProvider = import.meta.env.VITE_BACKEND_PROVIDER || "";
const RootApp = React.lazy(() =>
  backendProvider === "cloudbase"
    ? import("./CloudApp.jsx")
    : import("./App.jsx")
);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasswordGate>
      <React.Suspense fallback={<div className="min-h-screen bg-porcelain p-6 text-ink">正在加载...</div>}>
        <RootApp />
      </React.Suspense>
    </PasswordGate>
  </React.StrictMode>
);
