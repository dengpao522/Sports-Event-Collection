import { redirect } from 'next/navigation';
import { loginAction } from '../actions';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 后台登录页：密码来自 web/.env 的 ADMIN_PASSWORD */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect('/admin');
  const { error } = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-gray-900">运营采集台登录</h1>
        <p className="mt-1 text-sm text-gray-500">仅限站点运营者使用，密码配置在 web/.env 的 ADMIN_PASSWORD。</p>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              管理密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="请输入管理密码"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
