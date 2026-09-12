import { NavLink, Outlet } from "react-router";

const NAV = [
  { to: "/", label: "単語一覧" },
  { to: "/add", label: "追加" },
  { to: "/export", label: "書き出し" },
  { to: "/settings", label: "設定" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:m-8 focus:bg-blue-900 focus:p-8 focus:text-white"
      >
        本文へスキップ
      </a>

      <header className="border-solid-gray-420 border-b bg-blue-900 text-white">
        <div className="mx-auto flex max-w-[1024px] flex-col gap-8 px-16 py-16">
          <p className="text-std-20B-160">ankiski</p>
          <nav aria-label="メインナビゲーション">
            <ul className="flex flex-wrap gap-16">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `text-std-16B-170 underline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-white ${
                        isActive ? "underline" : "no-underline hover:underline"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1024px] flex-1 px-16 py-32">
        <Outlet />
      </main>

      <footer className="border-solid-gray-420 border-t">
        <div className="mx-auto max-w-[1024px] px-16 py-16 text-dns-14N-170 text-solid-gray-600">
          データはこのブラウザ（または拡張機能）にのみ保存されます。
        </div>
      </footer>
    </div>
  );
}
