'use strict';
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

hexo.extend.filter.register("after_render:html", (str) => {
  const re = /\[\[([^\*"\\/<>:|?]+)\]\]/g;
  return str.replace(re, function(match, p1) {
    const fileName = decodeURI(p1);
    if (cachedPost[fileName]) {
      console.log("fileName-Yes ",fileName);
      return `<a href="/${cachedPost[fileName]}">${fileName}</a>`;
    }
    return match;
  });
});






