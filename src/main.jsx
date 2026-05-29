import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import PasswordGate from "./features/auth/PasswordGate.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </React.StrictMode>
);
