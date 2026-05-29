import { useEffect, useMemo, useState } from "react";

const sharedEmail = import.meta.env.VITE_FAMILY_SHARED_EMAIL || "";

export default function PasswordGate({ children }) {
  const [password, setPassword] = useState("");
  const [userReady, setUserReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const familyEmail = useMemo(() => sharedEmail, []);

  useEffect(() => {
    let unsubscribe = () => undefined;
    let mounted = true;

    import("firebase/auth")
      .then(({ onAuthStateChanged }) =>
        import("../../lib/firebase").then(({ auth }) => ({ auth, onAuthStateChanged }))
      )
      .then(({ auth, onAuthStateChanged }) => {
        if (!mounted) return;
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setSignedIn(Boolean(user));
          setUserReady(true);
        });
      })
      .catch((authError) => {
        console.error("Firebase auth state failed", authError);
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
    if (!password.trim() || !familyEmail) return;

    setBusy(true);
    setError("");

    try {
      const [{ browserLocalPersistence, setPersistence, signInWithEmailAndPassword }, { auth }] =
        await Promise.all([import("firebase/auth"), import("../../lib/firebase")]);

      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, familyEmail, password);
      setPassword("");
    } catch (loginError) {
      console.error("Firebase sign in failed", loginError);
      setError(getFriendlyAuthError(loginError));
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
        {!familyEmail && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            缺少共享账号邮箱环境变量。
          </p>
        )}

        <button
          disabled={busy || !familyEmail}
          className="mt-5 min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "正在进入..." : "进入家族空间"}
        </button>
      </form>
    </FullScreenShell>
  );
}

function getFriendlyAuthError(error) {
  const code = error?.code || "";

  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "密码不正确，请再试一次。";
  }

  if (code === "auth/user-not-found") {
    return "Firebase 里没有这个共享账号，请先创建 family@chen.com。";
  }

  if (code === "auth/network-request-failed") {
    return "手机网络连接 Firebase 失败。请换 Wi-Fi/流量测试，或确认手机网络能访问 Firebase。";
  }

  if (code === "auth/operation-not-allowed") {
    return "Firebase 没有启用邮箱密码登录，请在 Authentication 里开启 Email/Password。";
  }

  if (code === "auth/unauthorized-domain") {
    return "当前域名未加入 Firebase 授权域名，请把 leiyuancun.pages.dev 加到 Authorized domains。";
  }

  return `登录失败：${code || error?.message || "未知错误"}`;
}

function FullScreenShell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8f5ef_0%,#f1d7a2_52%,#dbe8df_100%)] px-4 py-8">
      {children}
    </main>
  );
}
