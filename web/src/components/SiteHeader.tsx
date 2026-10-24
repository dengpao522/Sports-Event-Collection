import Link from 'next/link';

/** 站点头部：品牌标识 + 主导航 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-base font-black text-white">
            全
          </span>
          <span className="text-lg font-extrabold tracking-tight text-gray-900">
            全民运动
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-gray-600">
          <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
            找比赛
          </Link>
          <Link
            href="/submit"
            className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700"
          >
            我要投稿
          </Link>
        </nav>
      </div>
    </header>
  );
}
