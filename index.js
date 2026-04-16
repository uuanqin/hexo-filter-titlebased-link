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

const cachedPost = {};
let lastPost;

const REGEX_TITLEBASED_LINK = /(?<!\!)\[\[\s*([^*"\\\/<>:?\[\]|#]+)\s*(#[^"\\\/\[\]|]+)?\s*(\\?\|[^"\/<>:?\[\]]*)?\s*\]\]/g;
const REGEX_CODEBLOCK = /^( {0,3})(`{3,})([^\n]*)\n([\s\S]*?)\n\1\2`*/gm;
const REGEX_INLINE_CODE = /`[^`\n]+`/g;
const REGEX_MATH_BLOCK = /\$\$[\s\S]*?\$\$/g;
const REGEX_MATH_INLINE = /\$(?!\s)((?:\\.|[^$\\])+?)(?<!\s)\$/g;


if (config.enable) {

  hexo.extend.filter.register('post_permalink', function (data) {
    lastPost = data;
    return data;
  }, 1);

  hexo.extend.filter.register('post_permalink', function (permalink) {
    if (lastPost) {
      const fileName = lastPost.source.match(/[^/]*$/)[0].replace(/\.md$/, '');
      permalink = permalink.startsWith("/") ? permalink.substring(1) : permalink;
      cachedPost[fileName] = permalink;
      // log.debug("filename:"+fileName + " permalink: ",permalink)
    }
    return permalink;
  }, 25);

  hexo.extend.filter.register("before_post_render", (post) => {
    let tempContent = post.content;
    if (!tempContent) return post;

    tempContent = tempContent.replace(/\r\n/g, '\n');

    // 代码块保护
    const blockCodeProtect = protectionTool(
      tempContent,
      REGEX_CODEBLOCK
    );
    tempContent = blockCodeProtect.protectedContent;

    // 公式块保护
    const mathBlockProtect = protectionTool(tempContent, REGEX_MATH_BLOCK);
    tempContent = mathBlockProtect.protectedContent;

    // 行内代码保护
    const inlineCodeProtect = protectionTool(
      tempContent,
      REGEX_INLINE_CODE
    );
    tempContent = inlineCodeProtect.protectedContent;

    const mathInlineProtect = protectionTool(tempContent, REGEX_MATH_INLINE);
    tempContent = mathInlineProtect.protectedContent;

    tempContent = tempContent.replace(REGEX_TITLEBASED_LINK, replaceBiLink);
    tempContent = mathInlineProtect.restoreCt(tempContent);
    tempContent = inlineCodeProtect.restoreCt(tempContent);
    tempContent = mathBlockProtect.restoreCt(tempContent);
    tempContent = blockCodeProtect.restoreCt(tempContent);
    post.content = tempContent;
    return post;
  }, 9);
}

function replaceBiLink(match, p1, p2, p3) {
  const fileName = decodeURI(p1).trim();
  let anchor;
  if (p2) {
    let title = decodeURI(p2); // 不能含有 % 符号，会报错
    title = title.toLowerCase();
    title = title.replace(/[ ~!@#$^&*()_+.=\-`]+/g, '-');
    title = title.replace(/^-+|-+$/g, '');
    anchor = "#" + title;
  } else {
    anchor = "";
  }
  let link_text;
  if (p3) {
    link_text = decodeURI(p3).replace(/^\\?\|/, '');
    link_text = link_text === "" ? fileName : link_text;
  } else {
    link_text = fileName;
  }
  if (cachedPost[fileName]) {
    log.debug("hexo-filter-titlebased-link: Replace -", fileName);
    return `${config.custom_html.before_tag}<a ${config.custom_html.link_attributes} href='/${cachedPost[fileName]}${anchor}'>${config.custom_html.before_text}${link_text}${config.custom_html.after_text}</a>${config.custom_html.after_tag}`;
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
  const protect_symbol = `_pr0TEC7_${seed}_hxF3Tb5l_`;

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
    // 匹配所有形如 __PROTECT_seed_数字__ 的占位符
    const restoreRegex = new RegExp(`${protect_symbol}(\\d+)`, 'g');
    return text.replace(restoreRegex, (m, index) => cache[index]);
  };

  return {protectedContent, restoreCt};
}
