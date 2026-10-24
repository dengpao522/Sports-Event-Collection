import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-5xl">🏅</div>
      <h1 className="mt-4 text-lg font-bold text-gray-900">没有找到这场赛事</h1>
      <p className="mt-2 text-sm text-gray-500">它可能已下线，或链接有误。</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
      >
        返回赛事列表
      </Link>
    </div>
  );
}
