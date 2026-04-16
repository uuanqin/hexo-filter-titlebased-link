'use strict';

const config = hexo.config.titlebased_link = Object.assign({
  enable: false,
  custom_html: {
    link_attributes: "",
    before_tag: "",
    after_tag: "",
    before_text: "",
    after_text: ""
  }
}, hexo.config.titlebased_link);

const log = require('hexo-log').default({
  debug: false,
  silent: false
});

let cachedPost = null;

const REGEX_TITLEBASED_LINK = /(?<!!)\[\[\s*([^*"\\\/<>:?\[\]|#]+)\s*(#[^"\\\/\[\]|]+)?\s*(\\?\|[^"\/<>:?\[\]]*)?\s*\]\]/g;
const REGEX_CODEBLOCK = /^( {0,3})(`{3,})([^\n]*)\n([\s\S]*?)\n\1\2`*/gm;
const REGEX_INLINE_CODE = /`[^`\n]+`/g;
const REGEX_MATH_BLOCK = /\$\$[\s\S]*?\$\$/g;
const REGEX_MATH_INLINE = /\$(?!\s)((?:\\.|[^$\\])+?)(?<!\s)\$/g;

if (config.enable) {
  // 显式注册生成前钩子
  hexo.extend.filter.register('before_generate', () => {
    initCache(hexo);
  });

  hexo.extend.filter.register("before_post_render", (post) => {
    if (!cachedPost) initCache(hexo);

    let tempContent = post.content;
    if (!tempContent) return post;

    tempContent = tempContent.replace(/\r\n/g, '\n');

    const protectors = [];

    [REGEX_CODEBLOCK, REGEX_MATH_BLOCK, REGEX_INLINE_CODE, REGEX_MATH_INLINE
    ].forEach(reg => {
      const p = protectionTool(tempContent, reg);
      tempContent = p.protectedContent;
      protectors.push(p);
    });

    tempContent = tempContent.replace(REGEX_TITLEBASED_LINK, replaceBiLink);
    while (protectors.length > 0) {
      tempContent = protectors.pop().restoreCt(tempContent);
    }
    post.content = tempContent;
    return post;
  }, 9);
}

/**
 * 核心索引构建函数
 */
function initCache(ctx) {
  cachedPost = {};
  // 使用 model 访问数据库比 locals 更直接稳定
  const posts = ctx.model('Post').toArray();
  const pages = ctx.model('Page').toArray();

  const processItem = (item) => {
    const source = item.source;
    if (!source) return;
    // 提取文件名逻辑
    const fileName = item.source.match(/[^/]*$/)[0].replace(/\.md$/, '');

    // 这里的 path 处理很关键：确保它是不带 / 开头的纯路径
    let link = item.path || '';
    link = link.replace(/index\.html$/, '');
    if (link.startsWith('/')) link = link.substring(1);

    cachedPost[fileName.toLowerCase()] = link;
  }

  posts.forEach(processItem);
  pages.forEach(processItem);

  log.info(`[Hexo-Link] Index built: ${Object.keys(cachedPost).length} items.`);
}

function replaceBiLink(match, p1, p2, p3) {
  const rawFileName = decodeURI(p1).trim();
  const fileNameKey = rawFileName.toLowerCase();

  if (cachedPost && cachedPost[fileNameKey]) {
    let anchor = "";
    if (p2) {
      let title = decodeURI(p2).toLowerCase(); // 不能含有 % 符号，会报错
      title = title.replace(/[ ~!@#$^&*()_+.=\-`]+/g, '-').replace(/^-+|-+$/g, '');
      anchor = "#" + title;
    }
    let link_text = rawFileName;
    if (p3) {
      link_text = decodeURI(p3).replace(/^\\?\|/, '') || rawFileName;
    }

    log.debug("hexo-filter-titlebased-link: Replace -", rawFileName);
    return `${config.custom_html.before_tag}<a ${config.custom_html.link_attributes} href='/${cachedPost[fileNameKey]}${anchor}'>${config.custom_html.before_text}${link_text}${config.custom_html.after_text}</a>${config.custom_html.after_tag}`;
  }
  return match;
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
