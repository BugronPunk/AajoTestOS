# AajoTestOS

一个网页版操作系统。宁静、极简，功能上接近你对 Windows 或 macOS 的期待，完全运行在浏览器标签页中。

其他语言版本：[English](./README.md) · [Français](./README.fr.md)

## 目录

1. 项目简介
2. 快速开始
3. 环境要求
4. 架构
5. 存储引擎
6. 安全模型
7. 实时网关
8. 国际化
9. 脚本命令
10. 环境变量
11. API 参考
12. 错误码
13. 测试
14. 通过隧道分享开发服务器
15. 部署到 Railway
16. 键盘快捷键
17. 性能预算
18. 故障排查
19. 代码规范

## 项目简介

AajoTestOS 在浏览器中完整呈现桌面隐喻：开机动画、登录界面、锁屏、菜单栏、程序坞、控制中心、Spotlight 搜索、通知中心，以及可拖动、可缩放、可吸附的窗口。

内置十五个应用：

- **备忘录**，自动保存、可置顶、支持颜色标签
- **扫雷**，三种难度，含个人成绩与共享排行榜
- **聊天**，社交核心：陌生人消息配额、好友邀请、好友之间的媒体分享、在线状态与正在输入提示
- **文件** 与 **照片**，由真实上传的媒体驱动
- **设置**、**终端**、**计算器**、**音乐**、**日历**、**时钟**、**天气**、**监视器**、**画板**、**贪吃蛇**

所有数据都保存在磁盘上的 JSON 存储中。没有外部数据库，没有云服务，也不依赖任何第三方账户。

## 快速开始

```bash
git clone <你的仓库地址> aajotestos
cd aajotestos
npm install
npm run dev
```

打开 http://localhost:8080 并创建账户。安装到此为止：没有配置文件，无需准备数据库，也没有初始化脚本。

第一次注册会创建 `data/users.json` 以及同目录下的其余存储文件。

## 环境要求

- **Node.js 20 或更高版本。** 本项目在 Node 22 上开发。
- **npm。** 任何较新版本均可。仓库已提交 `package-lock.json`，因此 `npm ci` 可复现。
- `node_modules` 约需 550 MB 磁盘空间。

不需要任何全局工具。不需要 Docker、数据库服务器或 Redis。

## 架构

项目严格遵循 Model、View、Controller 分层。

```
server.mjs                  单一来源入口：Next 与实时网关
server/
  chatGateway.mjs           Socket.IO 接线与握手认证

src/
  app/
    api/                    控制器。每个资源一个路由文件。
      auth/                 注册、登录、登出、当前会话
      chat/                 会话列表、消息、发送、好友、邀请
      minesweeper/          成绩与排行榜
      media/[id]/           经过授权的媒体字节流
      notes/  settings/  upload/  users/  health/
    layout.tsx  page.tsx  globals.css

  lib/
    store/engine.ts         存储引擎。事务、集合、媒体。
    models/                 模型。全部业务规则都在这里。
      user.ts  session.ts  note.ts  message.ts  friendship.ts  score.ts  media.ts
    auth/
      password.ts           scrypt 哈希与校验
      session.ts            会话 Cookie 辅助函数
    api/
      handlers.ts           withAuth 包装、ok 与 fail 响应
      client.ts             浏览器端 fetch 封装
    i18n/                   词典与翻译上下文
    os/                     外壳基础设施：store、viewport、时钟、音频、主题

  components/
    os/                     外壳视图：Desktop、Window、Dock、MenuBar 等
    apps/<应用名>/           各应用的视图
    ui/                     十四个 shadcn 基础组件，全部在用

tests/                      Vitest 测试套件
```

### 维持分层的几条铁律

- **模型永不从 `components/` 导入。** 业务规则不知道界面的存在。
- **控制器不包含业务规则。** 一个路由文件只负责解析入参、调用一个模型函数、整理响应。
- **视图永不直接访问存储。** 它们通过 `lib/api/client.ts` 调用 API。
- **服务端永不输出可显示的文案。** 每个失败都是一个翻译键。参见**错误码**。

聊天是这套分层最好的示例，因为它是最复杂的功能：

- `components/apps/Chat/types.ts` 描述 API 返回的数据形状
- `components/apps/Chat/useChatController.ts` 承载全部状态、数据请求与 socket 接线
- `components/apps/Chat/ChatApp.tsx` 只负责绘制，不做别的

## 存储引擎

`src/lib/store/engine.ts` 是一个小型事务性 JSON 存储。它的存在是因为需求要求使用文件存储且不引入数据库。

### 集合

每个集合是 `DATA_DIR` 下的独立文件：

```
data/
  users.json
  sessions.json
  notes.json
  messages.json
  friendships.json
  scores.json
  media.json
  media/<userId>/<mediaId>.<ext>
```

拆分很重要。当所有数据挤在一个文件里时，记录一次扫雷成绩会把每一条消息和每一个账户重新写一遍磁盘。

### 事务

先读取、再判断、然后分步写入，这本身就是竞态。两个请求可能在任何一方写入之前都通过了同一个校验。`transaction` 把数据行交到写锁内部，从而关闭这个时间窗口：

```ts
return transaction(["users"], ({ users }) => {
  if (users.some((u) => u.username === name)) {
    return { error: "auth.error.usernameTaken" };
  }
  users.push(newUser);
  return { user: newUser };
});
```

可以依赖的性质：

- 只加载你声明的集合，也只写回这些集合。
- 在函数体内抛出异常会中止写入，磁盘保持原样。
- 提交时先写入一个名称唯一的临时文件，再执行原子重命名，因此并发读取永远看不到半截文件。
- 一次被拒绝的事务不会污染队列中的下一次事务。

### 媒体

上传内容会被解码、按 MIME 白名单校验、依据真实解码后的字节数做大小检查，然后写入磁盘。`media.json` 中只保存元数据。消息记录携带 `mediaId`，绝不携带 base64。

允许的类型：PNG、JPEG、GIF、WebP、MP4、WebM。单个文件最大 4 MB。

### 扩展性限制，直说

写锁是进程内的。**只能运行一个实例。** 两个副本指向同一目录会互相破坏数据。若将来确实需要横向扩展，存储接口的设计足够收敛，可以在不改动任何一个模型函数的前提下换成 SQLite。

## 安全模型

### 密码

使用 **scrypt** 哈希，参数 N=16384、r=8、p=1，派生密钥 64 字节，每个用户拥有独立的 16 字节随机盐。存储格式为 `scrypt$N$r$p$盐$哈希`。

校验通过 `timingSafeEqual` 以常数时间完成。针对不存在的用户名发起的登录同样会执行一次等价的 scrypt 计算，因此响应耗时不会泄露某个账户是否存在。

密码最短 8 个字符。

### 会话

令牌为 `crypto.randomBytes` 产生的 256 位随机数，采用 base64url 编码。Cookie 设置为 `httpOnly`、`sameSite=lax`、`path=/`，并在 `NODE_ENV` 为 `production` 时启用 `secure`。会话有效期 7 天，过期记录在每次登录时清理，而不依赖定时器。

### 实时身份

浏览器从不自称身份。网关在握手阶段读取会话 Cookie，若无法解析出有效会话则直接拒绝连接。参见**实时网关**。

### 媒体授权

`GET /api/media/[id]` 只把字节返回给上传者本人，或返回给确实在消息中收到过该文件的人。猜测 id 会得到 403。匿名请求得到 401。

### 输入校验

壁纸、强调色、主题、语言与头像颜色在存储前都会对照白名单校验，因为它们会被回填进样式属性。扫雷用时有取值范围限制。备忘录正文有长度上限。

### 已知但尚未实现的实践

- 登录尝试没有速率限制。在暴露到公网之前应当补上。
- 没有 CSRF 令牌。`sameSite=lax` 的 Cookie 是修改状态类路由上唯一的跨站防护。

## 实时网关

Socket.IO 挂载在**与应用相同的 HTTP 服务器**上，路径为 `/socket.io`，端口相同。

这是刻意为之，也是本项目最重要的一项部署决策：

- 一个隧道或一个托管端口即可暴露整个系统。
- 会话 Cookie 属于同站，因此握手会自动携带它，完全不需要 CORS 配置。
- 不存在需要单独启动、单独守护、或者容易忘记开启的第二个进程。

### 事件

客户端到服务端：

- `message:new` `{ toUserId, messageId }`
- `invite:new` `{ toUserId }`
- `invite:responded` `{ toUserId }`
- `typing` `{ toUserId, isTyping }`

服务端到客户端：

- `message:incoming` `{ fromUserId, messageId }`
- `invite:incoming` `{ fromUserId }`
- `invite:resolved` `{ fromUserId }`
- `typing` `{ fromUserId, isTyping }`
- `presence` `{ userId, online }`
- `presence:snapshot` `{ userIds }`，连接建立时发送一次

每个出站事件中的发送者身份都取自已验证的会话，绝不取自客户端传来的载荷。

## 国际化

三种语言完整支持：**英语**、**法语**、**中文**。各 297 个键，并强制保持完全一致。

- 词典位于 `src/lib/i18n/dictionaries.ts`。
- `useI18n()` 返回 `t`、`locale` 与 `bcp47`。
- 所有 `Intl` 调用都应使用 `bcp47`。不要在组件中硬编码语言标签。
- 服务端返回翻译键而非句子，因此错误提示会以用户所选语言正确显示。

修改后校验一致性：

```bash
npm run typecheck && npm run lint
```

新增语言的步骤：扩展 `Locale` 联合类型、添加词典、在 `src/lib/i18n/context.tsx` 中补充 BCP 47 标签、并在设置中加入该选项。

## 脚本命令

- `npm run dev`: 开发服务器，端口 8080，支持快速刷新
- `npm run build`: 生产构建，任何类型错误都会导致失败
- `npm run start`: 生产服务器
- `npm run lint`: 对整个项目执行 ESLint
- `npm run typecheck`: TypeScript 检查，不产出文件
- `npm test`: Vitest 单次运行
- `npm run test:watch`: Vitest 监听模式

实时网关没有单独的启动命令，它随应用一起启动。

## 环境变量

全部可选。默认值即可提供一个完整可用的系统。

- `PORT`: 页面、API 与 socket 共用的端口。默认 `8080`。托管平台会自动注入。
- `HOST`: 监听的网络接口。默认 `0.0.0.0`。若只想限制在本机访问，可设为 `127.0.0.1`。
- `DATA_DIR`: 存储与媒体文件的位置。默认 `./data`。**生产环境请指向已挂载的卷。**
- `DEV_ORIGINS`: 允许跨来源访问开发服务器的额外主机名，以逗号分隔。常见隧道域名已默认信任。对生产构建无影响。
- `NEXT_PUBLIC_SOCKET_URL`: 仅用于网关运行在不同主机这一少见场景。保持不设置，浏览器就会连回它自身的来源。

如需修改，请将 `.env.example` 复制为 `.env`。

## API 参考

所有路由返回 JSON。所有失败的响应形如 `{ "error": "<翻译键>" }`。需要认证的路由在缺少有效会话 Cookie 时返回 `401` 与 `common.error.auth`。

### 认证

```
POST /api/auth
  { action: "signup" | "login", username: string, password: string }
  -> { user: PublicUser, locale: "en" | "fr" | "zh" }   设置会话 Cookie

GET  /api/auth
  -> { user: PublicUser | null, media: MediaRecord[], locale }

POST /api/auth/logout
  -> { ok: true }                                       清除会话 Cookie
```

### 备忘录

```
GET    /api/notes                       -> { notes: NoteRecord[] }
POST   /api/notes    { title, content, color }          -> { note }
PATCH  /api/notes    { id, title?, content?, color?, pinned? } -> { note }
DELETE /api/notes?id=<noteId>           -> { ok: true }
```

更新与删除时归属关系是匹配条件的一部分，因此任何账户都无法通过猜测 id 去改动别人的备忘录。

### 聊天

```
GET   /api/chat/conversations   -> { conversations: [{ peer, lastMessage, unread, isFriend }] }
PATCH /api/chat/conversations   -> { ok: true, marked: number }     全部标记为已读

GET   /api/chat/messages?peerId=<id>
  -> { messages, isFriend, canSend, reason?, kind,
       strangerMax, strangerMaxChars, strangerRemaining }

POST  /api/chat/send
  { toUserId, content?, kind: "text" | "image" | "video", mediaId? }
  -> { message }

GET   /api/chat/friends         -> { friends: PublicUser[] }
GET   /api/chat/invites?scope=incoming|sent -> { invites }
POST  /api/chat/invites  { toUserId }       -> { invite }
PATCH /api/chat/invites  { inviteId, accept } -> { ok, accepted, peerId }
```

### 聊天规则经济

这部分承载着真正的业务规则，值得精确说明。

- 两个尚未成为好友的账户，**各自可以发送 3 条消息**。配额**按发送者计算**，而不是按会话计算，因此回复永远是可能的。配额用完的一方仍然可以被对方回复。
- 陌生人之间的消息上限为 **500 个字符**，超长消息会被**拒绝**，而不是被悄悄截断。
- 图片与视频**仅限好友之间**，该限制在服务端强制执行。媒体消息必须引用发送者确实拥有的文件。
- 接受邀请后，消息配额与媒体限制会同时解除。
- 被拒绝的邀请之后可以重新发送，这一对用户不会被永久封锁。

### 媒体

```
POST /api/upload   { dataUrl, name }   -> { media: MediaRecord }
GET  /api/media/<mediaId>              -> 原始字节，或 401 / 403 / 404
```

### 其他

```
GET   /api/users?q=<查询词>                       -> { users: PublicUser[] }
PATCH /api/settings  { displayName?, bio?, wallpaper?, accent?, theme?, language?, avatarColor? }
GET   /api/minesweeper/scores                    -> { scores }
POST  /api/minesweeper/scores  { difficulty, seconds, won } -> { score }
GET   /api/minesweeper/leaderboard?difficulty=<d> -> { difficulty, leaderboard }
GET   /api/health                                -> { status, service, uptimeSeconds }
```

## 错误码

共五十个，按前缀分组。客户端通过 `t(code)` 解析。

- `common.error.*`: `auth`、`server`、`network`
- `auth.error.*`: `action`、`badCredentials`、`passwordShort`、`usernameChars`、`usernameLong`、`usernameShort`、`usernameTaken`
- `chat.error.*`: `alreadyFriends`、`empty`、`inviteMissing`、`invitePending`、`inviteRespond`、`inviteSend`、`mediaFriendsOnly`、`mediaMissing`、`mediaType`、`recipient`、`selfInvite`、`selfMessage`、`send`、`strangerLimit`、`tooLong`、`upload`、`userMissing`
- `notes.error.*`: `create`、`delete`、`load`、`missing`、`save`、`tooLong`
- `settings.error.*`: `accent`、`avatarColor`、`displayName`、`language`、`noPrefs`、`readFile`、`save`、`theme`、`wallpaper`
- `upload.error.*`: `invalid`、`missing`、`tooLarge`、`type`
- `minesweeper.error.*`: `difficulty`、`time`
- `files.error.*`: `load`、`upload`

新增错误码时必须同时加入三份词典。系统没有任何会把原始键直接显示给用户的兜底逻辑。

## 测试

```bash
npm test
```

三个套件共二十四个测试，全部运行在一次性的存储目录上。

- `tests/password.test.ts`: 哈希、校验、按用户加盐、畸形输入，以及针对最初那套线性哈希的回归测试：当时 `qBss1234` 能打开一个密码为 `pass1234` 的账户。
- `tests/concurrency.test.ts`: 写入竞态。五十个并发注册同一用户名，最终恰好产生一个账户。五十次并发的陌生人发送，最终恰好写入三条消息。二十五个并发邀请，最终恰好一条记录。此外还覆盖事务回滚与队列恢复。
- `tests/chatRules.test.ts`: 按发送者计算的配额、超长消息拒绝、媒体权限、上传校验以及邀请授权。

测试会在导入任何模块之前把 `DATA_DIR` 指向临时目录，因此绝不会触碰你的真实存储。

## 通过隧道分享开发服务器

```bash
npm run dev
ngrok http 8080
```

把 ngrok 打印出的 HTTPS 地址分享出去即可。就这么简单。

### 如果你用的是本项目更早的版本而它无法访问

过去有四个各自独立的问题会导致隧道访问失败。四个都已修复，了解它们有助于你在别处认出同类问题。

1. **Next 拒绝了自己的静态资源。** 在开发模式下，Next 会拦截来自其他来源、指向 `/_next` 之下的所有请求。访问者能拿到 HTML，却拿不到 CSS 和 JavaScript，于是页面没有样式，也永远无法完成水合。现在 `next.config.ts` 已信任常见隧道域名，其余情况由 `DEV_ORIGINS` 覆盖。
2. **Socket 指向了访问者自己的电脑。** 客户端连接的是硬编码的 `http://localhost:3003`，而在远端访问者的浏览器里，这指的是*他们自己的*机器。除主机本人外，所有人的聊天功能都是死的。现在客户端连回它自身加载的来源。
3. **CORS 拒绝了隧道来源。** 网关只放行 `http://localhost:8080`。改为同源之后，问题被彻底消除，而不是要求维护一份必须随部署地址同步更新的白名单。
4. **两个端口，一条隧道。** 网关此前是独立进程，监听 3003 端口，而 `ngrok http 8080` 无法暴露它。现在所有服务都在同一个端口上。

### 仍然无法访问

- 监听地址：`HOST` 必须是 `0.0.0.0`，这也是默认值。`127.0.0.1` 无法从隧道访问。
- ngrok 免费套餐首次访问会显示一个警告中间页，访问者点一次即可通过。付费套餐或自定义域名可以去掉它。
- 若使用的不是 ngrok 或 Cloudflare 的自定义隧道域名，需要显式声明：`DEV_ORIGINS=mytunnel.example.com npm run dev`。
- 若这次演示打算长时间挂着，建议使用 `npm run build && npm run start`。生产服务器完全没有跨来源资源拦截，而且明显更快。

## 部署到 Railway

`railway.json` 已提交并配置完毕。

```bash
railway init
railway up
```

### 首次部署前必读

**容器文件系统是临时的。** 每一个账户、备忘录、消息和上传文件都存放在 `DATA_DIR` 中。没有持久化卷，一次重新部署或重启就会把这些全部抹掉。

1. 在 Railway 控制台创建一个卷，并挂载到 `/data`。
2. 在服务变量中设置 `DATA_DIR=/data`。

跳过这一步，应用会一直正常运行，直到第一次重新部署，然后用一个空白登录界面迎接所有人。

### 两项不可省略的构建设置

这两项存在的原因是：缺少它们构建就会失败，而报错信息本身并不容易看懂。

**`.dockerignore` 让 `node_modules` 不进入镜像。** 生成的 Dockerfile 以 `COPY . /app/.` 结尾，因此若没有忽略文件，你本机构建出的 `node_modules` 会被复制进容器。`npm ci` 随后会尝试先删除它再重新安装，而在构建机的联合文件系统上这个删除会失败：

```
npm error EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'
```

仓库中已提交 `.dockerignore` 以及对应的 `.railwayignore`。它们同时把上传体积从约 730 MB 降到约 1 MB，这占了构建时间的大部分。

**构建过程显式安装 devDependencies。** Railway 会设置 `NODE_ENV=production`，此时 npm 会跳过 devDependencies。TypeScript、Tailwind 以及各类型声明包都在其中，因此紧接着 `next build` 就会因为找不到模块而失败。这正是构建命令写成 `npm ci --include=dev && npm run build` 而不是普通 `npm ci` 的原因。如果你在构建日志里看到 `npm warn config production`，关键就在这项设置。

### 这份配置做了什么

- 使用 `npm ci && npm run build` 构建，因此以锁文件为准。
- 使用 `npm run start` 启动，它会自动读取 Railway 注入的 `PORT`。
- 健康检查指向 `/api/health`，该接口会真正读取存储，因此当数据目录不可写时部署会在健康检查阶段失败，而不是对外提供一个坏掉的应用。
- 失败时自动重启，最多十次。
- **将 `numReplicas` 固定为 1。** 这不是出于成本考虑。存储引擎的写锁是进程内的，两个副本共享同一个卷会互相破坏数据。

### 需要设置的变量

- `DATA_DIR=/data`（必需，见上文）
- `NODE_ENV=production` 已由启动脚本设置
- `PORT` 由 Railway 注入，请勿自行设置

同样的结构适用于 Render、Fly 以及任何容器托管平台：一个端口、一个副本、一个挂载卷。

## 键盘快捷键

修饰键在 macOS 上是 Command，其他平台上是 Control。

- `Mod+K`: 打开或关闭 Spotlight
- `Mod+N`: 为当前应用新开一个窗口
- `Mod+W`: 关闭当前窗口
- `Mod+M`: 最小化当前窗口
- `Mod+Enter`: 最大化或还原当前窗口
- `Mod+Tab`: 向前切换已打开的窗口
- `Mod+Shift+Tab`: 向后切换
- `Escape`: 关闭 Spotlight、控制中心或通知中心

窗口也可以通过拖拽到屏幕边缘或角落来吸附：左右半屏、顶部最大化，以及四个四分之一区域。

## 性能预算

以下是代码所对标的目标。

- **窗口拖动：每帧脚本耗时低于 4 毫秒**，帧预算为 16.7 毫秒。拖动时在 `requestAnimationFrame` 内直接把 `translate3d` 变换写到元素上，并且只在松开指针时向 store 提交一次。指针移动过程中不触发任何 React 重渲染。
- **整个外壳只用一个计时器。** `useClock(granularityMs)` 共享同一个定时器，并且只在组件真正显示的值发生变化时才重渲染。
- **整个外壳只有一个 resize 监听器**，通过 `useViewport()` 提供。
- **媒体永不内联。** 字节流由 `/api/media/<id>` 提供，并带有长期不可变的缓存头。
- **开机动画每个标签页只播放一次**，而不是每次刷新都播。

## 故障排查

**端口 8080 已被占用。** 说明还有进程在运行。用 `lsof -nP -iTCP:8080 -sTCP:LISTEN` 找到它，或者换端口启动：`PORT=3000 npm run dev`。

**提示「Another next dev server is already running」但没有任何进程在监听。** 被强制结束的开发服务器会在 `.next/dev` 留下锁文件。删除该目录后重新启动：

```bash
rm -rf .next/dev && npm run dev
```

**聊天里所有人都显示离线，消息也不实时到达。** 说明 socket 没有连上。打开浏览器控制台：反复出现 `unauthorized` 表示会话 Cookie 没能到达握手阶段，通常意味着你已经退出登录。重新登录即可。

**一切正常，但重新部署后应用变空了。** 你缺少持久化卷。参见**部署到 Railway**。

**构建因类型错误而失败。** 这是刻意设计。`ignoreBuildErrors` 已关闭并将保持关闭。运行 `npm run typecheck` 查看完整列表。

**上传被拒绝。** 只接受 PNG、JPEG、GIF、WebP、MP4 与 WebM，且按解码后的大小计算不超过 4 MB。

**消息发不出去。** 检查 `/api/chat/messages` 响应中的 `strangerRemaining`。非好友各有三条配额，每条不超过 500 个字符。

**没有声音。** 界面音效默认关闭，请在控制中心开启。此外浏览器要求先有用户操作才允许播放音频。

## 代码规范

这些是强制执行的，不是口号。不满足则构建失败。

- **不允许任何抑制注释。** `src/` 下不得出现 `eslint-disable`、`@ts-ignore` 或 `@ts-nocheck`。当前数量为零，并且要保持为零。
- **不允许死代码。** 不留未使用的文件、导出、依赖或目录。
- **类型检查是构建的一部分。** `ignoreBuildErrors` 已关闭。
- **React 严格模式已开启。**
- **标识符中不使用连字符。** 值与函数用 camelCase，组件与类型用 PascalCase，常量用 SCREAMING_SNAKE_CASE。
- **注释解释为什么，而不是是什么。** 在修复过缺陷的位置，注释会记录当时的故障模式，以免有人再次引入。

提交 pull request 之前：

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

四项必须全部通过。
