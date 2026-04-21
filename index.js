'use strict';

const config = hexo.config.titlebased_link = Object.assign({
  enable: false,
  custom_html: {
    link_attributes: "",
    before_tag: "",
    after_tag: "",
    before_text: "",
    after_text: ""
  },
  backlinks: {
    enable: false
  },
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
  hexo.extend.filter.register('before_generate', () => {
    initCache(hexo);
  });

  hexo.extend.filter.register("before_post_render", (post) => {
    if (!cachedPost) initCache(hexo);

    // 将当前文章的引用信息注入到 post 对象中，方便模板直接使用 page.bi_links
    const fileNameKey = getFileName(post).toLowerCase();
    if (cachedPost[fileNameKey]) {
      post.bi_links = cachedPost[fileNameKey].bi_links;
    }

    let tempContent = post.content;
    if (!tempContent) return post;

    tempContent = tempContent.replace(/\r\n/g, '\n');

    const protectors = [];
    [REGEX_CODEBLOCK, REGEX_MATH_BLOCK, REGEX_INLINE_CODE, REGEX_MATH_INLINE].forEach(reg => {
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
 * 获取文章文件名的统一函数
 */
function getFileName(item) {
  if (!item.source) return "";
  const match = item.source.match(/[^/]*$/);
  return match ? match[0].replace(/\.md$/, '') : "";
}

/**
 * 核心索引构建函数
 */
function initCache(ctx) {
  cachedPost = {};
  const posts = ctx.model('Post').toArray();
  const pages = ctx.model('Page').toArray();
  const allItems = [...posts, ...pages];

  // 第一遍扫描：建立基础路径索引
  allItems.forEach(item => {
    const fileName = getFileName(item);
    if (!fileName) return;

    let link = item.path || '';
    link = link.replace(/index\.html$/, '');
    if (link.startsWith('/')) link = link.substring(1);

    cachedPost[fileName.toLowerCase()] = {
      path: link,
      title: item.title || fileName,
      // bi_links 用于存储关系
      bi_links: {
        inbounds: [],  // 入链：谁引用了我
        outbounds: []  // 出链：我引用了谁
      }
    };
  });

  // 第二遍扫描：分析引用关系 (如果开启了 backlinks)
  if (config.backlinks.enable) {
    allItems.forEach(item => {
      const sourceFileName = getFileName(item);
      const sourceKey = sourceFileName.toLowerCase();
      if (!cachedPost[sourceKey]) return;

      let content = item._content || item.content || "";
      // 简单剔除代码块，防止误判代码里的 [[link]]
      content = content
        .replace(REGEX_CODEBLOCK, '')
        .replace(REGEX_MATH_BLOCK, '')
        .replace(REGEX_INLINE_CODE, '')
        .replace(REGEX_MATH_INLINE, '');

      let match;
      const seenInThisPost = new Set(); // 防止单篇文章内重复引用导致重复计数

      while ((match = REGEX_TITLEBASED_LINK.exec(content)) !== null) {
        const targetFileName = decodeURI(match[1]).trim();
        const targetKey = targetFileName.toLowerCase();

        // 如果目标文章存在，且不是自引用，且本次扫描没记录过
        if (cachedPost[targetKey] && targetKey !== sourceKey && !seenInThisPost.has(targetKey)) {
          seenInThisPost.add(targetKey);

          // 记录出链 (Outbound)
          cachedPost[sourceKey].bi_links.outbounds.push({
            title: cachedPost[targetKey].title,
            path: cachedPost[targetKey].path
          });

          // 记录入链 (Inbound)
          cachedPost[targetKey].bi_links.inbounds.push({
            title: cachedPost[sourceKey].title,
            path: cachedPost[sourceKey].path
          });
        }
      }
    });
  }

  log.debug(`[Hexo-Link] Index built: ${Object.keys(cachedPost).length} items. Relations indexed.`);
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
