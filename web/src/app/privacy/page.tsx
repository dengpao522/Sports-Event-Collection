import type { Metadata } from 'next';

export const metadata: Metadata = { title: '隐私政策' };

/** 隐私政策（收集邮箱前的合规前置页面，MVP 简版） */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm leading-7 text-gray-700">
      <h1 className="text-xl font-extrabold text-gray-900">隐私政策</h1>
      <p className="mt-2 text-gray-400">最近更新：2026 年 10 月 24 日</p>

      <h2 className="mt-6 font-bold text-gray-900">我们收集什么</h2>
      <p>
        当你订阅赛事提醒时，我们仅收集你的<b>邮箱地址</b>以及你订阅的赛事/城市/品类信息；当你投稿或报错时，
        收集你主动填写的内容和选填的联系方式（手机号 / 微信 / 邮箱均可，留空亦可）。本站不要求注册账号，不收集身份证等额外个人信息。
      </p>

      <h2 className="mt-5 font-bold text-gray-900">用来做什么</h2>
      <ul className="list-disc pl-5">
        <li>仅用于向你发送你订阅的赛事报名开启、截止、变更或来年提醒；</li>
        <li>投稿联系方式仅用于核实你提供的赛事线索；</li>
        <li>不会用于商业营销，不会出售或分享给第三方。</li>
      </ul>

      <h2 className="mt-5 font-bold text-gray-900">确认与退订</h2>
      <p>
        订阅后你会收到一封确认邮件，点击确认链接提醒才生效。每封提醒邮件底部都有一键退订链接，退订即时生效。
      </p>

      <h2 className="mt-5 font-bold text-gray-900">信息聚合说明</h2>
      <p>
        本站展示的赛事信息均采集自公开渠道并标注来源，报名在赛事官方渠道完成，本站不经手报名与费用。
        赛事时间与规则以官方最新发布为准。
      </p>

      <h2 className="mt-5 font-bold text-gray-900">联系我们</h2>
      <p>如对个人信息处理有疑问，可通过投稿页的联系方式与运营者联系（个人项目）。</p>
    </div>
  );
}
