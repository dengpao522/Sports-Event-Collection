/** 生成不可猜测的随机 token（订阅确认 / 退订用） */
import { randomBytes, randomUUID } from 'node:crypto';

export function newToken(): string {
  return randomBytes(24).toString('hex');
}

/** 幂等键用的稳定标识 */
export function newId(): string {
  return randomUUID();
}
