# hexo-filter-titlebased-link

Transfer wiki links (based on the title) in Markdown files to permalink.

将基于标题的双向链接转换为 Hexo 设定的永久链接。

This plugin makes you easy to use wiki links (its form may be `[[Title]]` or `[[Title|Alias]]`) in Hexo.
It would be more useful when you use [Obsidian](https://obsidian.md/) to manage your blogs.

> [!NOTE]
> - Ensure that no more than one vertical bar (`|`) is included in a wiki link.
> - If one vertical bar is included, `Alias` should not be empty.
> - Additionally, ensure that the titles of all your articles are unique.

## Installation

```markdown
npm install hexo-filter-titlebased-link --save
```

## Usage

To configure this plugin, add these contents in the `_config.yml`:

```yaml
titlebased_link:
  enable: true   # enable this plugin
  class_name: "" # class name of wiki links
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

you can see my last post by clicking this link: [[my_post_1]],

or [[my_post_1|this link]].
```

After rendering by Hexo, the resultant HTML file of `my_post_2.md` will be:

```html
<p>This is my_post_2, </p>
<p>you can see my last post by clicking this link: <a href="/p/2024/04/12/14/18/50/">my_post_1</a>,</p>
<p>or <a href="/p/2024/04/12/14/18/50/">this link</a>.</p>
```

If you specify a class name (e.g., `my-class`) in the options, the rendering result will be:

```html
<a class="my-class" href="/p/2024/04/12/14/18/50/">this link</a>
```

## Related Hexo Plugins

- [hexo-filter-link-post](https://github.com/tcatche/hexo-filter-link-post): Transfer relative post link in markdown file to post link. 
将文件里的通过相对路径引用的 markdown 文件转为对应的文章的链接。
- [hexo-abbrlink](https://github.com/Rozbo/hexo-abbrlink): Create one and only link for every post for hexo. 
为每一篇 Hexo 文章创建独一无二的永久链接。

## License

[MIT](./LICENSE)
