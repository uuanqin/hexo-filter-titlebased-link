

function getFileName(item) {
  if (!item.source) return "";
  const match = item.source.match(/[^/]*$/);
  return match ? match[0].replace(/\.md$/, '') : "";
}

/**
 * 安全获取嵌套属性
 */
function getDeepValue(obj, path) {
  return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined) ? prev[curr] : undefined, obj);
}

/**
 * 序列化属性值供 HTML 使用
 */
function serializeAttr(val) {
  if (Array.isArray(val)) return val.join(' ');
  if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '&quot;');
  return String(val);
}

/**
 * 保护函数：将不需要解析的文本暂时替换掉
 * @param {string} content - 原始文本
 * @param {RegExp} regex - 匹配要保护内容的正则
 * @param {Function} skipCondition - 排除条件 (例如：如果是 live-photo 则不保护)
 */
function protectionTool(content, regex, skipCondition) {
  const cache = [];
  const seed = Math.random().toString(36).slice(2, 8);
  const protect_symbol = `_p_7_${seed}_H_l_`;

  const protectedContent = content.replace(regex, (...args) => {
    // 根据传入的条件判断是否需要跳过保护
    if (skipCondition && skipCondition(...args)) {
      return args[0];
    }

    const id = `${protect_symbol}${cache.length}`;
    cache.push(args[0]);
    return id;
  });

  // 返回处理后的文本和还原函数
  const restoreCt = (text) => {
    if (cache.length === 0) return text;
    // 匹配所有形如 __PROTECT_seed_数字__ 的占位符
    const restoreRegex = new RegExp(`${protect_symbol}(\\d+)`, 'g');
    return text.replace(restoreRegex, (_, index) => cache[index]);
  };

  return {protectedContent, restoreCt};
}

module.exports = {
  getFileName,
  getDeepValue,
  serializeAttr,
  protectionTool
}
