import { useEffect, useMemo, useState } from "react";
import {
  cloudbaseAuth,
  cloudbaseEnabled,
  cloudbaseSharedEmail,
} from "../../lib/cloudbase";

const backendProvider =
  import.meta.env.VITE_BACKEND_PROVIDER || (cloudbaseEnabled ? "cloudbase" : "firebase");
const firebaseSharedEmail = import.meta.env.VITE_FAMILY_SHARED_EMAIL || "";

export default function PasswordGate({ children }) {
  const [password, setPassword] = useState("");
  const [userReady, setUserReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sharedEmail = useMemo(
    () => (backendProvider === "cloudbase" ? cloudbaseSharedEmail : firebaseSharedEmail),
    []
  );

  useEffect(() => {
    if (backendProvider === "cloudbase") {
      if (!cloudbaseAuth) {
        setUserReady(true);
        return undefined;
      }

      cloudbaseAuth
        .getLoginState()
        .then((loginState) => setSignedIn(Boolean(loginState)))
        .catch(() => setSignedIn(false))
        .finally(() => setUserReady(true));

      cloudbaseAuth.onLoginStateChanged?.((loginState) => {
        setSignedIn(Boolean(loginState));
        setUserReady(true);
      });

      return undefined;
    }

    let unsubscribe = () => undefined;
    let mounted = true;

    import("firebase/auth")
      .then(({ onAuthStateChanged }) => import("../../lib/firebase").then(({ auth }) => ({ auth, onAuthStateChanged })))
      .then(({ auth, onAuthStateChanged }) => {
        if (!mounted) return;
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setSignedIn(Boolean(user));
          setUserReady(true);
        });
      })
      .catch(() => {
        setSignedIn(false);
        setUserReady(true);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function enterFamilySpace(event) {
    event.preventDefault();
    if (!password.trim() || !sharedEmail) return;

    setBusy(true);
    setError("");

    try {
      if (backendProvider === "cloudbase") {
        const result = await cloudbaseAuth.signInWithEmailAndPassword({
          email: sharedEmail,
          password,
        });

        if (result?.error) throw result.error;
        setSignedIn(true);
      } else {
        const [{ browserLocalPersistence, setPersistence, signInWithEmailAndPassword }, { auth }] =
          await Promise.all([import("firebase/auth"), import("../../lib/firebase")]);

        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, sharedEmail, password);
      }

      setPassword("");
    } catch {
      setError("密码不正确，请再试一次。");
    } finally {
      setBusy(false);
    }
  }

  if (!userReady) {
    return (
      <FullScreenShell>
        <p className="text-base font-semibold text-slate-600">正在确认访问权限...</p>
      </FullScreenShell>
    );
  }

  if (signedIn) return children;

  return (
    <FullScreenShell>
      <form
        onSubmit={enterFamilySpace}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_20px_70px_rgba(31,41,55,0.16)]"
      >
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">Family Passcode</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">请输入家族共享密码</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          验证成功后，这台设备会保持登录状态，之后打开网页可直接进入。
        </p>

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">共享密码</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            inputMode="text"
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            placeholder="输入家族密码"
            required
          />
        </label>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {!sharedEmail && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            缺少共享账号邮箱环境变量。
          </p>
        )}
        {backendProvider === "cloudbase" && !cloudbaseEnabled && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            缺少 VITE_CLOUDBASE_ENV_ID，无法连接腾讯云 CloudBase。
          </p>
        )}

        <button
          disabled={busy || !sharedEmail || (backendProvider === "cloudbase" && !cloudbaseEnabled)}
          className="mt-5 min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "正在进入..." : "进入家族空间"}
        </button>
      </form>
    </FullScreenShell>
  );
}

function FullScreenShell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8f5ef_0%,#f1d7a2_52%,#dbe8df_100%)] px-4 py-8">
      {children}
    </main>
  );
}
