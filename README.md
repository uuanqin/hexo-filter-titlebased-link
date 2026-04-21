# hexo-filter-titlebased-link

A powerful Hexo plugin that transforms title-based Wiki-links into permalinks, featuring full backlink indexing and customizable metadata mapping.

将基于标题的双向链接转换为 Hexo 永久链接，并支持全量回溯引用索引与自定义元数据映射。

This plugin makes you easy to use wiki links (its form may be `[[Title]]` `[[Title#Anchor]]` or `[[Title|Alias]]`) in Hexo.
It is specifically optimized for [Obsidian](https://obsidian.md/) users who want to build a seamless Digital Garden.
Beyond simple link replacement, it builds a complete relationship graph of your posts and allows you to inject Front-matter data directly into your HTML links.

中文文档详见我的博客：[用 Hexo 构建你的数字花园](https://blog.uuanqin.top/p/9c61131/)

> [!NOTE]
> - For the plugin to work as expected, make sure the titles of all your articles are unique.

## Installation

```shell
npm install hexo-filter-titlebased-link --save
```

## Full Configuration

```yaml
titlebased_link:
  enable: true
  attribute_mapping: {} # e.g., { "category": "cat" }
  custom_html:
    link_attributes: "" # Additional attributes for all <a> tags
    before_tag: ""
    after_tag: ""
    before_text: ""
    after_text: ""
  backlinks:
    enable: false        # Must be `true` to use indexing features
    inject_to_post: true # Access via page.bi_links in themes
    generate_json: ""
    export_local: ""     # Path to save JSON on your local computer
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

## Advanced Features

### Backlinks & Relationship Indexing

When `inject_to_post` is enabled, you can access the relationship data in your theme templates (EJS/Pug):

- `page.bi_links.inbounds`: List of posts that link to the current post.

- `page.bi_links.outbounds`: List of posts that the current post links out to.

```yaml
titlebased_link:
  enable: true   # enable this plugin
  backlinks:
    enable: true # enable backlink indexing
    inject_to_post: true # Injects relationship data into the `page` object
```

Example of backlinks' structure:

```yaml
# page.bi_links.inbounds structure
- title: "Origin Post"
  path: "p/2024/origin/"
```

### Index Data Export (JSON)

Export your entire blog's relationship graph to a JSON file.
You can export to your hexo public directory or a local absolute path.

```yaml
titlebased_link:
  enable: true   # enable this plugin
  backlinks:
    enable: true # enable backlink indexing
    generate_json: "links.json"       # (Optional) Exports to your-blog.com/links.json
    export_local: "D:/data/graph.json" # (Optional) Exports to a local absolute path
```

### Metadata Mapping (Data Attributes)

Pass Front-matter data from the target post directly to the `<a>` tag. 
This is perfect for styling links based on their status or category.

```yaml
titlebased_link:
  enable: true   # enable this plugin
  attribute_mapping:
    "status": "status"        # Maps 'status' from Front-matter to 'data-status'
    "meta.topic": "topic"     # Maps nested 'meta.topic' to 'data-topic'
```

Assume you have a post named `my_post_3` and it has `status: doing` in its Front-matter.

You write a wiki link in another post:

```markdown
[[my_post_3]]
```
After rendering by Hexo, you will get:

```html
<a href="..." data-status="doing">my_post_3</a>
```

### Customize Your Links

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
