# Stage 5 — Devpost 提交材料

> 这是当前阶段的完整工作说明。开始前先读 `STATE.md`；完成后把证据写入 `evidence/`，更新 `STATE.md`，再读下一个阶段文件。不要提前执行后续阶段。

准备以下字段和素材：

### Project name

### Elevator pitch

Provide a short tagline for the project. You can change this later. (Max 200 characters)

### Thumbnail

Generate a PNG for this project. **Generate, do not crop from the project.**

### About the project

Be sure to write what inspired you, what you learned, how you built your project, and the challenges you faced. Format your story in Markdown, with LaTeX support for math.
(Devpost 有几个容易出问题的地方：
1. 公式：尽量使用反引号包裹的普通文本公式，不要依赖 LaTeX 渲染。
2. SVG/XML：代码标签必须用反引号包裹，避免被 Markdown 当作 HTML 解析。
3. 标题：使用 ## 和 ###，不要混用 HTML 标题标签。
4. 图片和视频：建议单独放在项目描述对应章节，不要嵌套在复杂列表中。
5. 数字声明：100% accuracy、0.8ms latency、15 benchmarks 等数据最好确保有对应测试记录，避免评审追问时无法复现。)

```md
## Inspiration

## What it does

## How we built it

## Challenges we ran into

## Accomplishments that we're proud of

## What we learned

## What's next for [Project name]
```

### Built with

Add up to 25 tags. Only include the necessary ones. (Don't need too much, Exp: react, typescript, web-audio-api, accessibility)

### "Try it out" links

Add links where people can try the project or see the code: the deployed URL (GitHub Pages / Vercel / Render) and the GitHub repository URL.

### Image gallery

- JPG, PNG or GIF format
- 5 MB max file size
- 3:2 ratio for best results
- Up to 15 images
- Each image needs an English caption within 150 characters (Sometimes, make it short and easily understood, it's labelled under the image, so sometimes no need too much)

### 提交方式：人类填写并提交

你不登录 Devpost、不操作提交页面、不填写在线表单。人类负责填写、上传素材和点击 Submit。

你的交付物是可直接粘贴的提交包，写入 `submission/`：

- `submission/fields.md` — 按 Devpost 表单顺序给出最终值：项目名、pitch、about（Markdown）、tags、Try it out 链接、gallery captions、视频链接。
- `submission/assets/` — thumbnail、gallery 图片、demo 视频；文件名与 captions 一一对应。
- `submission/checklist.md` — 人类操作步骤 + 逐项验收清单。

规则：

1. 每个字段只给一个最终版本，不要让人类在多个候选里挑。
2. 无法确定的字段标注 `TODO(human)` 并说明缺什么，不要猜。
3. 字段值必须能直接复制粘贴，不要混入解释性文字。
4. 素材必须检查格式、比例、尺寸和文件大小，不满足就重新生成。

### 提交规则

1. 所有文案中的能力宣称必须与 Stage 3.5 的验证结果一致，不得编造指标。
2. 准备一份提交检查清单：标题、pitch、thumbnail、about、tags、links、gallery、video。
3. **不要自行注册比赛、输入账号密码、操作 Devpost 页面或点击 Submit。** 不索要密码、cookie 或 session token，不要求人类提供登录态。
4. 提交包必须自包含：人类只打开 Devpost、复制字段、上传素材即可完成，不需要再问你问题。
5. 链接必须实际打开验证，确认部署地址和仓库地址可访问。
6. 人类提交后，如果公开页面可访问，验证标题、图片、视频、链接和 Markdown 渲染是否正常；发现错误报告给人类，不要自行编辑已提交内容。

### Stage 5 完成条件

- `submission/fields.md`、`submission/assets/`、`submission/checklist.md` 齐全。
- `evidence/stage-5-submission.md` 记录字段来源、素材路径、链接验证结果和检查清单。
- 所有链接可访问。
- 缩略图和 gallery 符合格式要求。
- 人类确认已按提交包完成提交。
- 公开页面已验证（如可访问）。

---
