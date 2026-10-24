import Link from 'next/link';

/** 站点页脚：免责声明、数据来源与隐私政策（收集邮箱前的合规要求） */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-xs leading-6 text-gray-500">
        <p>
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
