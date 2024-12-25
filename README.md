# hexo-filter-titlebased-link

Transfer wiki links (based on the title) in Markdown files to permalink.

将基于标题的双向链接转换为 Hexo 设定的永久链接。

This plugin makes you easy to use wiki links (its form may be `[[Title]]` `[[Title#Anchor]]` or `[[Title|Alias]]`) in Hexo.
It would be more useful when you use [Obsidian](https://obsidian.md/) to manage your blogs. 
In addition, it allows you to customize the rendered HTML links.

> [!NOTE]
> - For the plugin to work as expected, make sure the titles of all your articles are unique.

## Installation

```markdown
npm install hexo-filter-titlebased-link --save
```

## Quick Start

To configure this plugin, add these contents in the `_config.yml`:

```yaml
# hexo-filter-titlebased-link
# https://github.com/uuanqin/hexo-filter-titlebased-link
titlebased_link:
  enable: true   # enable this plugin
```

Hexo sets every post a [Permalinks](https://hexo.io/docs/permalinks.html), which can be configured in the `_config.yml`.

Here is an example:

```yaml
# in _config.yml
permalink: p/:year/:month/:day/:hour/:minute/:second/
```

Assume you have a post named `my_post_1` whose permalink is `p/2024/04/12/14/18/50/`. 
In another post named `my_post_2`, you wrote a wiki link to `my_post_1`:

```markdown
This is my_post_2, 

you can click this link: [[my_post_1]],

or [[my_post_1|Any title]].
```

After rendering by Hexo, the resultant HTML file of `my_post_2.md` will be:

```html
<p>This is my_post_2, </p>
<p>you can click this link: <a href="/p/2024/04/12/14/18/50/">my_post_1</a>,</p>
<p>or <a href="/p/2024/04/12/14/18/50/">Any title</a>.</p>
```

## Customize Your Links

Similar to the [hexo-filter-custom-link](https://github.com/uuanqin/hexo-filter-custom-link),
this plugin reserves several slots for custom HTML.

```js
`
${config.custom_html.before_tag}
    <a ${config.custom_html.link_attributes} href="/p/2024/04/12/14/18/50/">
        ${config.custom_html.before_text}
        my_post_1
        ${config.custom_html.after_text}
    </a>
${config.custom_html.after_tag}
`
```

For example, if your option is:

```yaml
titlebased_link:
  enable: true   # enable this plugin
  custom_html:
    link_attributes: 'class="my-link" title="example"'
    before_tag: '<p class="my-p"> Before the link '
    after_tag: ' After the link </p>'
    before_text: ''
    after_text: ''
```

Then the resultant HTML will be (the code below was formatted for ease of review):

```html
<p class="my-p"> 
    Before the link
    <a class="my-link" title="example" href="/p/2024/04/12/14/18/50/">this link</a>
    After the link 
</p>
```

## Related Hexo Plugins

- [hexo-filter-custom-link](https://github.com/uuanqin/hexo-filter-custom-link): Customize the rendered HTML of Links. 自定义链接渲染后的 HTML。
- [hexo-filter-link-post](https://github.com/tcatche/hexo-filter-link-post): Transfer relative post link in markdown file to post link. 
将文件里的通过相对路径引用的 markdown 文件转为对应的文章的链接。
- [hexo-abbrlink](https://github.com/Rozbo/hexo-abbrlink): Create one and only link for every post for hexo. 
为每一篇 Hexo 文章创建独一无二的永久链接。

更多 Obsidian 语法插件推荐详见我的博客文章 [Hexo 博客适配 Obsidian 新语法](https://blog.uuanqin.top/p/d4bc55f2/)。

## License

[MIT](./LICENSE)
