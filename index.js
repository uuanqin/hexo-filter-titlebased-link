'use strict';

const config = hexo.config.titlebased_link = Object.assign({
  enable: false,
  link_attributes: "",
  custom_html_before_link: "",
  custom_html_after_link: ""
}, hexo.config.titlebased_link);

const log = require('hexo-log').default({
  debug: false,
  silent: false
});

const cachedPost = {};
let lastPost;


if (config.enable) {

  hexo.extend.filter.register('post_permalink', function (data) {
    lastPost = data;
    return data;
  }, 1);

  hexo.extend.filter.register('post_permalink', function (permalink) {
    if (lastPost) {
      const fileName = lastPost.source.match(/[^/]*$/)[0].replace(/\.md$/, '');
      cachedPost[fileName] = permalink;
    }
    return permalink;
  }, 25);

  hexo.extend.filter.register("before_post_render", (post) => {
    const re = /\[\[([^\*"\\/<>:?\[\]\|]+)\|?([^\*"\\/<>:|?\[\]]*)?\]\]/g;
    post.content = post.content.replace(re, function (match, p1, p2) {
      const fileName = decodeURI(p1);
      const link_text = p2 ? decodeURI(p2) : fileName;
      if (cachedPost[fileName]) {
        log.info("hexo-filter-titlebased-link: Replace -", fileName);
        return `${config.custom_html_before_link}<a ${config.link_attributes} href="/${cachedPost[fileName]}">${link_text}</a>${config.custom_html_after_link}`;
      }
      return match;
    });
    return post;
  });
}
