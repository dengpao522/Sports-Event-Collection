/**
 * HTML 实体转义（安全修复 CWE-79）
 * 用于手工拼接的 HTML 字符串模板（邮件 HTML、非 React 渲染的结果页），
 * 防止用户可控文本注入标签/属性。React 渲染面无需使用（自动转义）。
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
