# My Library

`bookmanager.html` 是一个使用 HTML、Tailwind CSS 和 JavaScript 编写的移动优先、单文件藏书管理应用。用户可以通过扫描条形码或手动输入 ISBN 获取图书信息，记录阅读状态、笔记、价格和封面图片，并通过 CSV 进行导入与导出备份。

当存在 Firebase 配置时，应用会将数据同步到 Firestore；如果 Firebase 不可用，则会自动回退到浏览器 `localStorage` 本地存储模式。

## 功能特性

- 支持 **英文、日文、简体中文** 三种界面语言
- 面向移动端的界面布局
- 考虑 iOS 安全区域的底部留白处理
- 基于 `html5-qrcode` 的摄像头条形码扫描
- 支持手动 ISBN 查询
- 图书信息获取的回退顺序：
  1. `openBD`
  2. `Google Books API`
  3. `Open Library Books API`
- 支持图书记录的新增、编辑、删除
- 可记录以下字段：
  - ISBN
  - 书名
  - 作者
  - 价格
  - 阅读状态（`unread` / `reading` / `read`）
  - 阅读感想 / 笔记
  - 封面图片
  - 录入日期
- 支持拍照或上传封面图片
- 保存前会在前端进行图片压缩
- 支持 CSV 导出与导入
- 可选的 Firebase Authentication + Firestore 同步
- 云端配置不可用时自动切换为纯本地模式

## 应用工作方式

1. 用户先选择界面语言。
2. 如果 Firebase 初始化成功且认证通过，应用会从 Firestore 读取图书数据。
3. 如果云同步不可用，则使用浏览器 `localStorage`。
4. 用户可以通过扫描条形码或手动输入 ISBN 添加图书。
5. 应用会调用公共 API 自动填充书名、作者和封面信息。
6. 用户补充或修改其他字段后保存。
7. 已保存图书以卡片形式展示，并按 `entryDate` 倒序排序。

## 数据模型

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 本地记录 ID 或 Firestore 文档 ID |
| `isbn` | string | ISBN / 条形码值 |
| `title` | string | 书名。表单中唯一必填项 |
| `author` | string | 作者名 |
| `price` | string | 自由输入的价格字段 |
| `status` | string | `unread`、`reading` 或 `read` |
| `notes` | string | 阅读感想或备注 |
| `coverUrl` | string | 从外部 API 获取的封面图片 URL |
| `customImage` | string | 前端压缩后保存的 Base64 上传图片 |
| `entryDate` | string | 用于排序的 ISO 时间戳 |

## 技术栈

- **HTML5**
- **原生 JavaScript**
- 通过 CDN 加载的 **Tailwind CSS**
- 通过 CDN 加载的 **Lucide** 图标
- 用于扫码的 **html5-qrcode**
- **Firebase JS SDK 11.6.1**（可选）
- 使用到的浏览器 API：
  - `localStorage`
  - `fetch`
  - `FileReader`
  - `Canvas`
  - 摄像头 / 媒体访问

## 文件结构

```text
.
├── bookmanager.html
├── README.md
├── README.en.md
├── README.ja.md
└── README.zh.md
```

## 本地运行方式

这是一个无需构建的前端应用。最简单的方式是通过本地静态服务器运行。

```bash
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000/bookmanager.html
```

### 注意

- 使用摄像头进行条形码扫描时，通常需要 **`http://localhost` 或 `https`** 这样的安全上下文。
- 主要依赖库通过 CDN 加载；如果不将这些资源本地化，则需要联网。

## 可选的 Firebase 集成

HTML 中会检查以下可选的全局变量：

- `__firebase_config`
- `__app_id`
- `__initial_auth_token`

当 Firebase 配置有效时，应用会：

- 初始化 Firebase
- 如果提供 `__initial_auth_token`，则使用自定义令牌登录
- 否则尝试匿名登录
- 监听以下 Firestore 路径中的图书数据变更：

```text
artifacts/{appId}/users/{uid}/books
```

### Firebase 说明

- 如果没有提供 `__initial_auth_token`，则 Firebase 项目需要启用 **匿名认证**。
- Firestore 安全规则应与上述路径保持一致。
- 即使 Firebase 初始化失败，应用仍会继续以本地模式运行。

## 使用的外部服务

图书信息按以下顺序从公开 API 获取：

1. **openBD** —— 第一优先级，尤其适合日本书籍
2. **Google Books API** —— 第一层回退
3. **Open Library Books API** —— 第二层回退

返回结果取决于 ISBN 覆盖情况和各 API 的可用性。

## 图片处理

当用户拍照或上传图片时，浏览器会执行以下处理：

- 读取图片
- 在保持宽高比的前提下缩放到最大 **600 × 800**
- 转换为 **JPEG**
- 以 **0.7** 的质量进行压缩
- 以 Base64 字符串形式保存到 `customImage`

用户上传的图片会覆盖该图书记录中从 API 获取的封面图。

## CSV 导入 / 导出

### 导出列

```csv
id,isbn,title,author,price,status,notes,coverUrl,entryDate
```

### 行为说明

- 导出的文件名为 `my_library.csv`
- 导入时默认期待相同或相近的列结构
- 只有 `title` 非空的记录会被导入
- 记录会使用已有 ID 或新生成的 ID 作为文档 ID / 本地 ID

### 重要限制

`customImage` **不会** 包含在 CSV 导出或导入中。这意味着，**用户上传的图片不会在 CSV 备份中保留**。

## 注意事项与限制

- 已选择的语言不会在页面刷新后自动保留。
- 部分提示框和日志消息仍然是硬编码中文。
- 浏览器 `localStorage` 容量有限，图片过多时可能超出限制。
- 即使做了压缩，较大的图片仍可能触发 Firestore 文档大小限制或浏览器存储限制。
- CSV 解析逻辑较轻量，不能保证覆盖所有 CSV 边界情况。
- 条形码扫描需要摄像头权限。
- 图书信息自动获取需要网络连接。

## 总结

这是一个轻量、纯浏览器端的个人藏书管理应用，主要优势包括：

- 无需构建，部署简单
- 可通过条形码快速录入图书
- 提供多语言界面
- 即使没有云同步，也能以本地模式持续使用

适合个人藏书管理、读书记录，以及轻量级的小规模库存登记场景。
