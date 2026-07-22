import { Link, Outlet } from "react-router-dom";
import { PROFILE_CONFIG } from "./profileConfig";

export function PublicLayout() {
  return (
    <div className="min-h-full bg-app text-primary flex flex-col">
      <header className="sticky top-0 z-20 border-b border-default bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="min-w-0 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center shrink-0">
              <span className="flex gap-[2px]">
                <span className="w-[3px] h-3 bg-silver-300 rounded-sm" />
                <span className="w-[3px] h-3 bg-silver-500 rounded-sm" />
                <span className="w-[3px] h-3 bg-silver-300 rounded-sm" />
              </span>
            </span>
            <span className="text-sm font-semibold truncate">
              {PROFILE_CONFIG.displayName}
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            <a
              href="#projects"
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-md text-secondary hover:text-primary hover:bg-hover"
            >
              项目
            </a>
            <a
              href="#culture"
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-md text-secondary hover:text-primary hover:bg-hover"
            >
              积累
            </a>
            <a
              href="#contact"
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-md text-secondary hover:text-primary hover:bg-hover"
            >
              联系
            </a>
            <Link
              to="/try"
              className="px-2.5 py-1.5 rounded-md text-secondary hover:text-primary hover:bg-hover"
            >
              试用
            </Link>
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90"
            >
              登录
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
