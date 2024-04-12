'use strict';

const log = require('hexo-log')({
  debug: false,
  silent: false
});

const cachedPost = {};
let lastPost;
hexo.extend.filter.register('post_permalink', function(data){
  lastPost = data;
  return data;
}, 1);

hexo.extend.filter.register('post_permalink', function(permalink) {
  if (lastPost) {
    const fileName = lastPost.source.match(/[^/]*$/)[0].replace(/\.md$/, '');
    cachedPost[fileName] = permalink;
  }
  return permalink;
}, 25);

hexo.extend.filter.register("before_post_render", (post) => {
  const re = /\[\[([^\*"\\/<>:?\[\]\|]+)\|?([^\*"\\/<>:|?\[\]]*)?\]\]/g;
  post.content = post.content.replace(re, function(match, p1,p2) {
    const fileName = decodeURI(p1);
    if (cachedPost[fileName]) {
      log.info("hexo-filter-titlebased-link: Replace -",fileName);
      return p2?`<a href="/${cachedPost[fileName]}">${decodeURI(p2)}</a>`:`<a href="/${cachedPost[fileName]}">${fileName}</a>`;
    }
    return match;
  });
  return post;
});





