# 部署到 Cloudflare Pages

这个项目分两部分：

- 静态页面（`index.html`、`css/`、`js/`、`assets/`）：普通网页文件
- `functions/api/ai-chat.js`：一个 Cloudflare Pages Function，代理豆包（火山方舟）API 调用。真实的 API Key 只存在 Cloudflare 后台的环境变量里，浏览器端拿不到，公开部署也不会暴露 Key。

用 Cloudflare Pages 而不是 Vercel，是因为 Vercel 登录要验证国外手机号，国内很多人卡在这一步；Cloudflare 注册只需要邮箱。

## 第一步：注册 Cloudflare 账号

打开 https://dash.cloudflare.com/sign-up ，用邮箱注册一个账号（会收到一封验证邮件，点确认链接）。不需要绑手机号。

## 第二步：把代码传到 GitHub

Cloudflare Pages 是通过连接 GitHub 仓库来部署的，所以需要先把这个项目传到 GitHub 上。

1. 去 https://github.com/new 创建一个新仓库（Repository），名字随便起，比如 `wanbao-ai-demo`，选 Public 或 Private 都可以，不要勾选"添加 README"（因为本地已经有文件了）。

2. 在本项目目录下执行（把 `你的GitHub用户名` 和 `仓库名` 换成实际的）：
   ```
   git add .
   git commit -m "AI 编程学习机交互原型"
   git branch -M main
   git remote add origin https://github.com/你的GitHub用户名/仓库名.git
   git push -u origin main
   ```
   第一次 push 时会弹出浏览器要求登录 GitHub 授权，正常操作即可。

## 第三步：在 Cloudflare 里连接这个仓库并部署

1. 登录 Cloudflare 后台：https://dash.cloudflare.com
2. 左侧菜单找到 "Workers 和 Pages"（或英文 "Workers & Pages"），点进去
3. 点 "创建"（Create），选择 "Pages" 标签下的 "连接到 Git"（Connect to Git）
4. 授权 Cloudflare 访问你的 GitHub，选中刚才创建的仓库
5. 部署配置页面：
   - Framework preset：选 "None"（不用框架）
   - Build command：留空
   - Build output directory：填 `/`（项目根目录，因为 index.html 就在根目录）
6. 点 "保存并部署"（Save and Deploy），等一两分钟

部署完成后会给你一个形如 `https://仓库名.pages.dev` 的链接——但这时候点开 AI 对话功能还不能用，因为还没配置 API Key（下一步）。

## 第四步：配置豆包 API Key

1. 在刚部署好的 Pages 项目页面里，点 "设置"（Settings）
2. 找到 "环境变量"（Environment Variables）
3. 点 "添加变量"（Add variable）：
   - 变量名：`DOUBAO_API_KEY`
   - 值：你的豆包 API Key（`ark-xxxx...`）
   - 环境：选 "生产环境"（Production）
4. 保存后，回到项目的 "部署"（Deployments）标签页，找到最新一次部署，点右侧的 "重试部署"（Retry deployment），让环境变量生效

## 第五步：访问

再打开一次 `https://仓库名.pages.dev` 这个链接，AI 对话功能就能正常用了。把这个链接发给别人，对方点开就能直接用，不需要装任何东西。

## 之后要更新代码怎么办

改完代码后执行：
```
git add .
git commit -m "更新说明"
git push
```
Cloudflare 会自动检测到 GitHub 仓库更新，自动重新部署，链接不变，通常一两分钟内生效。

## 关于 API Key 安全

- Key 只写在 Cloudflare 后台的环境变量里，**不会**出现在任何前端代码或 Git 仓库里（`.gitignore` 已经排除了本地可能残留的 `.env` 文件）。
- `functions/api/ai-chat.js` 收到前端的问题文本后，在服务器端加上 Key 转发给豆包，再把回复原样传回前端，浏览器全程看不到 Key。
- 这个 Key 之前在本地测试和对话记录里出现过明文，正式对外发布前建议去火山方舟控制台吊销旧 Key、生成一个新的，只填到 Cloudflare 环境变量里。
