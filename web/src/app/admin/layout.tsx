import Link from 'next/link';
import { logoutAction } from './actions';
import { isAdmin } from '@/lib/auth';

/**
 * 运营后台布局：顶栏导航（看板 / 赛事管理 / 投稿审核）
 * 鉴权不放在 layout：登录页 /admin/login 也位于本布局下，由各页面自行 requireAdmin()
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await isAdmin();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-base font-black text-white">
                运
              </span>
              <span className="text-lg font-extrabold tracking-tight text-gray-900">
                运营采集台
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-gray-600">
              <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
                运营看板
              </Link>
              <Link href="/admin/events" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
                赛事管理
              </Link>
              <Link href="/admin/import" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
                导入清单
              </Link>
              <Link
                href="/admin/submissions"
                className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700"
              >
                投稿审核
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              ↩ 回前台
            </Link>
            {loggedIn && (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  退出登录
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
