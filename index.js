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
        const re = /(?<!\!)\[\[([^\*"\\\/<>:?\[\]\|#]+)(#[^"\\\/\[\]\|]+)?(\|[^"\\\/<>:?\[\]]*)?\]\]/g;
        post.content = post.content.replace(re, function (match, p1, p2, p3) {
            const fileName = decodeURI(p1);
            let anchor;
            if (p2) {
                var title = decodeURI(p2); // 不能含有 % 符号，会报错
                title = title.toLowerCase();
                title = title.replace(/[ ~!@#$^&*()_+.=\-`]+/g, '-');
                title = title.replace(/^-+|-+$/g, '');
                anchor = "#" + title;
            } else {
                anchor = "";
            }
            let link_text;
            if (p3) {
                link_text = decodeURI(p3).substring(1);
                link_text = link_text === "" ? fileName : link_text;
            } else {
                link_text = fileName;
            }
            if (cachedPost[fileName]) {
                log.debug("hexo-filter-titlebased-link: Replace -", fileName);
                return `${config.custom_html.before_tag}<a ${config.custom_html.link_attributes} href="/${cachedPost[fileName]}${anchor}">${config.custom_html.before_text}${link_text}${config.custom_html.after_text}</a>${config.custom_html.after_tag}`;
            }
            return match;
        });
        return post;
    });
}
