'use strict';

const fs = require('fs');
const path = require('path');
const {slugize, deepMerge} = require('hexo-util');

const {getFileName, getDeepValue, protectionTool} = require('./lib/utils');

const defaultConfig = {
  enable: false,
  attribute_mapping: {},
  custom_html: {
    link_attributes: "",
    before_tag: "",
    after_tag: "",
    before_text: "",
    after_text: ""
  },
  backlinks: {
    enable: false,
    inject_to_post: true,
    generate_json: "",
    export_local: ""
  }
};

const include_ext = ['.md', '.markdown'];

// 使用 deepMerge 确保嵌套配置不会被覆盖丢失
const config = hexo.config.titlebased_link = deepMerge(defaultConfig, hexo.config.titlebased_link || {});

const log = require('hexo-log').default({debug: false, silent: false});

let cachedPost = null;

// 正则定义
const REGEX_TITLEBASED_LINK = /(?<!!)\[\[\s*([^*"\\\/<>:?\[\]|#]+)\s*(#[^"\\\/\[\]|]+)?\s*(\\?\|[^"\/<>:?\[\]]*)?\s*\]\]/g;
const REGEX_CODEBLOCK = /^( {0,3})(`{3,})([^\n]*)\n([\s\S]*?)\n\1\2`*/gm;
const REGEX_INLINE_CODE = /`[^`\n]+`/g;
const REGEX_MATH_BLOCK = /\$\$[\s\S]*?\$\$/g;
const REGEX_MATH_INLINE = /\$(?!\s)((?:\\.|[^$\\])+?)(?<!\s)\$/g;

if (config.enable) {
  // 注册生成前钩子
  hexo.extend.filter.register('before_generate', () => {
    initCache(hexo);
  });

  // 注册渲染钩子
  hexo.extend.filter.register("before_post_render", (post) => {
    if (!cachedPost) initCache(hexo);

    const fileNameKey = getFileName(post).toLowerCase();
    const cacheEntry = cachedPost[fileNameKey];

    // 注入内存：供模板 page.bi_links 调用
    if (config.backlinks.enable && config.backlinks.inject_to_post && cacheEntry) {
      post.bi_links = cacheEntry.bi_links;
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

  // 场景 A：生成到 Public (Hexo Generator)
  if (config.backlinks.enable && config.backlinks.generate_json) {
    hexo.extend.generator.register('bi_links_json', () => {
      return {
        path: config.backlinks.generate_json,
        data: JSON.stringify(cachedPost)
      };
    });
  }

  // 场景 B：生成到本地磁盘 (fs write)
  if (config.backlinks.enable && config.backlinks.export_local) {
    hexo.extend.filter.register('after_generate', () => {
      const outPath = config.backlinks.export_local;
      const fullPath = path.isAbsolute(outPath) ? outPath : path.join(hexo.base_dir, outPath);
      try {
        fs.mkdirSync(path.dirname(fullPath), {recursive: true});
        fs.writeFileSync(fullPath, JSON.stringify(cachedPost, null, 2));
        log.info(`[Hexo-Link] Data exported to: ${fullPath}`);
      } catch (e) {
        log.error(`[Hexo-Link] Failed to write local JSON: ${e.message}`);
      }
    });
  }
}

function initCache(ctx) {
  cachedPost = {};

  const posts = ctx.model('Post').toArray();
  const pages = ctx.model('Page').toArray();
  const allItems = [...posts, ...pages];

  // 第一遍：构建基础信息与属性映射
  allItems.forEach(item => {
    const source = item.source || '';
    const ext = path.extname(source).toLowerCase();
    if (include_ext && include_ext.length > 0) {
      if (!include_ext.includes(ext)) return;
    }

    const fileName = getFileName(item);
    if (!fileName) return;

    const fileNameKey = fileName.toLowerCase();

    let link = item.path || '';
    link = link.replace(/index\.html$/, '');
    if (link.startsWith('/')) link = link.substring(1);

    const dataAttrs = {};
    Object.keys(config.attribute_mapping).forEach(fmKey => {
      let val = getDeepValue(item, fmKey);

      if (val && typeof val === 'object') {
        if (typeof val.toArray === 'function') {
          val = val.toArray().map(v => v.name || v.title || String(v));
        } else {
          val = (val instanceof Date) ? val.toISOString() : (val.title || val.name || String(val));
        }
      }

      if (val !== undefined && val !== null) {
        let finalVal;
        if (Array.isArray(val)) {
          finalVal = val.join(' / ');
        } else {
          finalVal = String(val);
        }

        dataAttrs[`data-${config.attribute_mapping[fmKey]}`] = finalVal.replace(/"/g, '&quot;');
      }
    });

    const isDraft = (item.published === false);
    const finalPath = isDraft ? 'draft_post/' : link;
    cachedPost[fileNameKey] = {
      id: fileNameKey, // 显式存储 ID，前端绘图直接用
      path: finalPath,
      isDraft: isDraft,
      title: item.title || fileName,
      attrs: dataAttrs,
      bi_links: {inbounds: [], outbounds: []}
    };
  });

  // 第二遍：分析引用关系
  if (config.backlinks.enable) {
    allItems.forEach(item => {
      const sourceKey = getFileName(item).toLowerCase();
      const sourceEntry = cachedPost[sourceKey];
      if (!sourceEntry || sourceEntry.isDraft) return;

      let content = item._content || item.content || "";
      content = content
        .replace(REGEX_CODEBLOCK, '')
        .replace(REGEX_MATH_BLOCK, '')
        .replace(REGEX_INLINE_CODE, '')
        .replace(REGEX_MATH_INLINE, '');

      let match;
      const seen = new Set();

      while ((match = REGEX_TITLEBASED_LINK.exec(content)) !== null) {
        const targetKey = decodeURI(match[1]).trim().toLowerCase();
        const targetEntry = cachedPost[targetKey];

        // 记录 targetKey 作为 ID
        if (targetEntry && !targetEntry.isDraft && targetKey !== sourceKey && !seen.has(targetKey)) {
          seen.add(targetKey);

          // 记录出链 (Outbound)
          sourceEntry.bi_links.outbounds.push({
            id: targetKey,
            title: targetEntry.title,
            path: targetEntry.path
          });

          // 记录入链 (Inbound)
          targetEntry.bi_links.inbounds.push({
            id: sourceKey,
            title: sourceEntry.title,
            path: sourceEntry.path
          });
        }
      }
    });
  }

  log.debug(`[Hexo-Link] Index built: ${Object.keys(cachedPost).length} items.`);
}

function replaceBiLink(match, p1, p2, p3) {
  const rawFileName = decodeURI(p1).trim();
  const fileNameKey = rawFileName.toLowerCase();
  const entry = cachedPost[fileNameKey];

  if (entry) {
    let anchor = "";
    if (p2) {
      // decodeURI(p2) 拿到的是 "#标题" 这种带井号的内容
      const rawAnchor = decodeURI(p2).substring(1).trim();

      // slugize 默认就会处理：转小写、去空格、处理特殊字符
      const sluggified = slugize(rawAnchor, {transform: 1});
      anchor = sluggified ? "#" + sluggified : "";
    }
    let link_text = rawFileName;
    if (p3) {
      link_text = decodeURI(p3).replace(/^\\?\|/, '') || rawFileName;
    }

    log.debug("hexo-filter-titlebased-link: Replace -", rawFileName);

    // 处理动态 Data 属性
    const attrStr = Object.entries(entry.attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    const finalHref = entry.path.startsWith('/') ? entry.path : '/' + entry.path;
    return `${config.custom_html.before_tag}<a ${config.custom_html.link_attributes} ${attrStr} href='${finalHref}${anchor}'>${config.custom_html.before_text}${link_text}${config.custom_html.after_text}</a>${config.custom_html.after_tag}`;
  }
  return match;
}