import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import CloudApp from "./CloudApp.jsx";
import PasswordGate from "./features/auth/PasswordGate.jsx";

const backendProvider = import.meta.env.VITE_BACKEND_PROVIDER || "";
const RootApp = backendProvider === "cloudbase" ? CloudApp : App;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasswordGate>
      <RootApp />
    </PasswordGate>
  </React.StrictMode>
);
