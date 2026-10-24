/**
 * 把 Excel 中自由填写的“品类”原文（如“跑步·10K+亲子”“球类·匹克球/羽毛球”“登高·元旦”）
 * 归一到 PRD 5.2 的一级品类，并保留原文拆出的二级标签。
 */

export type CategoryKey =
  | '跑步'
  | '球类'
  | '户外'
  | '骑行'
  | '室内健身'
  | '水上'
  | '冰雪'
  | '棋牌智力'
  | '其他综合';

// 关键词 → 一级品类（命中即归类，顺序敏感：更具体的放前面）
const RULES: Array<{ cat: CategoryKey; keywords: string[] }> = [
  {
    cat: '水上',
    keywords: ['游泳', '冬泳', '铁三', '铁人三项', '桨板', '皮划艇', '帆船', '龙舟', '公开水域', '横渡'],
  },
  {
    cat: '冰雪',
    keywords: ['滑雪', '滑冰', '冰球', '冰雪', '雪地', '短道', '花滑', '花样滑冰'],
  },
  {
    cat: '骑行',
    keywords: ['骑行', '自行车', '单车', '公路赛', '山地车', '虚拟赛'],
  },
  {
    cat: '球类',
    keywords: [
      '羽毛球', '篮球', '足球', '乒乓球', '网球', '匹克球', '排球', '橄榄球',
      '台球', '壁球', '高尔夫', '羽超', '混双', '团体',
    ],
  },
  {
    cat: '棋牌智力',
    keywords: ['围棋', '象棋', '国际象棋', '桥牌', '电竞', '棋牌', '段级位'],
  },
  {
    cat: '室内健身',
    keywords: ['健身', 'crossfit', '搏击', '格斗', '拳击', '街舞', '舞蹈', '健美', '摔跤', '力量'],
  },
  {
    cat: '户外',
    keywords: [
      '越野', '徒步', '登山', '登高', '飞盘', '攀岩', '滑板', '轮滑',
      '定向', '露营', '垂钓', '山径', '跑山', '垂直马拉松', '高塔', '垂马',
    ],
  },
  {
    cat: '跑步',
    keywords: [
      '马拉松', '半马', '路跑', '跑步', '10k', '5k', '迷你跑', '欢乐跑',
      '彩色跑', '亲子跑', '健身跑', '迎新跑', '健康跑', '训练赛', '跑',
    ],
  },
];

/**
 * 归类主函数
 * @param raw 品类原文，可能含 · / + / 、 等分隔符，如“跑步·10K+亲子”
 * @returns category 一级品类；tags 二级标签数组（小写归一前的原文片段）
 */
export function classifyCategory(raw: string): {
  category: CategoryKey;
  tags: string[];
} {
  const text = (raw || '').trim();
  const lower = text.toLowerCase();

  // 拆二级标签：按常见分隔符切分，保留有信息量的片段
  const tags = Array.from(
    new Set(
      text
        .split(/[·・/／、,，+＆&和\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { category: rule.cat, tags };
    }
  }
  return { category: '其他综合', tags };
}
