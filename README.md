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
