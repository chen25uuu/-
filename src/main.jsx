import React from "react";
import { createRoot } from "react-dom/client";
import PasswordGate from "./features/auth/PasswordGate.jsx";

const backendProvider = import.meta.env.VITE_BACKEND_PROVIDER || "";
const RootApp = React.lazy(() =>
  backendProvider === "cloudbase"
    ? import("./CloudApp.jsx")
    : import("./App.jsx")
);

class RuntimeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("App runtime error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-porcelain px-4 py-8 text-ink">
          <section className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_70px_rgba(31,41,55,0.16)]">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-rosewood">Runtime Error</p>
            <h1 className="mt-3 text-2xl font-bold">页面加载失败</h1>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              请检查 Cloudflare Pages 的环境变量和 CloudBase 配置。错误信息：
            </p>
            <pre className="mt-4 overflow-auto rounded-lg bg-black/[0.04] p-3 text-xs text-ink/80">
              {this.state.error?.message || "Unknown error"}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RuntimeErrorBoundary>
      <PasswordGate>
        <React.Suspense fallback={<div className="min-h-screen bg-porcelain p-6 text-ink">正在加载...</div>}>
          <RootApp />
        </React.Suspense>
      </PasswordGate>
    </RuntimeErrorBoundary>
  </React.StrictMode>
);
