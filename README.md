# Yingfei Lab Blog

Yingfei Yao 的研究与技术博客，基于 [Hexo](https://hexo.io/) 和 [Fluid](https://github.com/fluid-dev/hexo-theme-fluid)，由 GitHub Actions 自动发布到 GitHub Pages。

## 本地预览

```bash
npm install
npm run server
```

浏览器打开 <http://localhost:4000>。

## 写一篇新文章

```bash
npm run new -- "文章标题"
```

然后编辑 `source/_posts/文章标题.md`。提交并推送到 `main` 分支后，GitHub Actions 会自动构建和发布。

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
