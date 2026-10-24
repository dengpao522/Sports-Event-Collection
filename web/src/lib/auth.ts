/**
 * 运营后台（/admin）鉴权：环境变量密码 + HttpOnly Cookie 会话
 * MVP 阶段单管理员，不建数据库用户体系；
 * 正式上线前可平滑替换为账号密码/鉴权服务
 */
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE = 'admin_session';

/** 由 ADMIN_PASSWORD 派生会话令牌（sha256，避免明文密码落入 Cookie） */
export function sessionTokenFor(password: string): string {
  return createHash('sha256').update(`quanmin-admin:${password}`).digest('hex');
}

/** 是否已登录：Cookie 令牌与当前 ADMIN_PASSWORD 派生值比对 */
export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === sessionTokenFor(expected);
}

/** 页面/动作守卫：未登录一律跳转登录页 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}
