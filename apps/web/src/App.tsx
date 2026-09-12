import { NotificationBanner } from "@ankiski/ui";
import { useEffect } from "react";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "./routes.tsx";
import { useVaultStore } from "./store/vault-store.ts";

export function App() {
  const status = useVaultStore((state) => state.status);
  const error = useVaultStore((state) => state.error);
  const init = useVaultStore((state) => state.init);

  useEffect(() => {
    if (useVaultStore.getState().status !== "idle") return;
    const extensionId = import.meta.env.VITE_EXTENSION_ID;
    void init(extensionId ? { extensionId } : {});
  }, [init]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {status === "error" ? (
        <NotificationBanner type="error" title="保存先を初期化できませんでした" className="m-16">
          {error}
        </NotificationBanner>
      ) : null}
      <AppRoutes />
    </BrowserRouter>
  );
}
