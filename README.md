# Yingfei Lab Blog

Yingfei Yao 的研究与技术博客，基于 [Hexo](https://hexo.io/) 和 [Fluid](https://github.com/fluid-dev/hexo-theme-fluid)，由 GitHub Actions 自动发布到 GitHub Pages。

## 本地预览

```bash
npm install
npm run server
```

浏览器打开 <http://localhost:4000>。`server` 会先完整构建四种语言，再以静态模式预览；修改内容后重新运行它即可查看更新。

默认英文位于 `/`；简体中文、繁体中文和日语分别位于 `/zh-CN/`、`/zh-TW/`、`/ja/`。页面右上角的 Language 菜单可以在同一页面的语言版本间切换，手机端可在导航菜单底部切换。

## 写一篇新文章

```bash
npm run new -- "文章标题"
```

然后编辑 `source/_posts/文章标题.md`。提交并推送到 `main` 分支后，GitHub Actions 会自动构建和发布。

文章原稿使用简体中文。新增或修改文章后，需要为新增的中文句子补全 `build/translations.json` 中的英文、日语译文；重要标题和界面用语可放在 `build/translation-overrides.json` 中人工修订。繁体中文由构建脚本自动转换。`npm run i18n:update -- en` 和 `npm run i18n:update -- ja` 可尝试调用在线服务生成初稿，但有免费额度限制，译文仍建议人工校对。普通 `npm run build` 不依赖在线翻译服务；如有缺失译文，它会列出错误并停止构建。

## 归档、分类和标签

导航按 Fluid 官网的方式提供三个独立入口：

- **归档**（`/archives/`）：按发布日期倒序，按年份分组；同时生成年度和月度归档。首页置顶不会改变归档的日期顺序。
- **分类**（`/categories/`）：按栏目组织文章，包含“网络互联”；相关教程位于 `/categories/network-connectivity/`。
- **标签**（`/tags/`）：按技术关键词交叉检索，如 Tailscale、Windows、HTTPS；同一篇文章可以有多个标签。

发布网络互联类教程时，在 Markdown 顶部的 Front-matter 设置日期、分类和技术标签：

```yaml
date: 2026-10-20 20:00:00
categories:
  - 网络互联
tags:
  - Tailscale
  - Windows
```

构建时会自动更新归档、分类文章数和标签，无需手工维护列表。上述日期和标签仅为写作示例，请替换为文章的实际信息。

## 常用命令

```bash
npm run clean   # 清理生成文件
npm run build   # 生成静态网站到 public/
npm run server  # 启动本地预览
```

站点地址：<https://yingfeilab.github.io>

## 修改页面背景

当前使用 [Fluid 官网演示站公开配置](https://github.com/fluid-dev/hexo-fluid-blog/blob/master/_config.fluid.yml)中的配图地址，图片由官方 CDN 加载，不是安装包中统一的灯塔背景。

- 在 `_config.fluid.yml` 中修改各页面类型的 `banner_img`：`index`（首页）、`post`（文章）、`archive`（归档）、`category`（分类）、`tag`（标签）、`about`（关于）、`page`（自定义页面）、`page404`、`links`（友链）。
- 单个页面可在 Markdown 顶部的 Front-matter 添加 `banner_img`，覆盖页面类型的默认设置；项目和论文页已分别设置。
- 文章的 `index_img` 只控制首页列表中的封面，与文章顶部背景独立。

如需使用自己的本地图片，将其放在 `source/img/` 下，然后填写 `/img/文件名.jpg`；提交推送后会随博客一起发布。
