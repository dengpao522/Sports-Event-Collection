import Link from 'next/link';
import { HOT_CITIES, CATEGORIES } from '@/lib/constants';

/** 站点页脚：免责声明、数据来源与隐私政策（收集邮箱前的合规要求） */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-xs leading-6 text-gray-500">
        {/* SEO 内链区：热门城市 × 品类落地页，全站页脚保证爬虫可达 */}
        <nav aria-label="热门城市" className="border-b border-gray-100 pb-4">
          <span className="mr-2 font-semibold text-gray-600">热门城市：</span>
          {HOT_CITIES.map((c) => (
            <Link
              key={c}
              href={`/city/${encodeURIComponent(c)}`}
              className="mr-3 text-brand-600 hover:underline"
            >
              {c}运动赛事
            </Link>
          ))}
        </nav>
        <nav aria-label="运动品类" className="mt-4 border-b border-gray-100 pb-4">
          <span className="mr-2 font-semibold text-gray-600">运动品类：</span>
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/category/${encodeURIComponent(c.key)}`}
              className="mr-3 text-brand-600 hover:underline"
            >
              {c.label}赛事
            </Link>
          ))}
        </nav>
        <p className="mt-4">
          全民运动仅聚合公开可查的赛事信息并链接到官方报名渠道，不代为报名、不收取任何费用。
          赛事时间、报名条件与费用均以赛事官方最新发布为准。
        </p>
        <p className="mt-2">
          <Link href="/privacy" className="text-brand-600 hover:underline">
            隐私政策
          </Link>
          <span className="mx-2">·</span>
          <Link href="/submit" className="text-brand-600 hover:underline">
            赛事投稿 / 信息报错
          </Link>
          <span className="mx-2">·</span>
          <span>数据由运营人工采集并持续核实，欢迎补充线索</span>
        </p>
        <p className="mt-2 text-gray-400">© 2026 全民运动（个人项目）</p>
      </div>
    </footer>
  );
}
