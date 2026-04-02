# 画风 LoRA 打标实战：国风三维 (Guofeng 3D)

训练"画风（Style）"类 LoRA，尤其是像"国风三维（Guofeng 3D）"这种既有特定审美（国风）又有特定材质（三维渲染）的复合风格，打标策略是成败的关键。

核心逻辑：

> **你打标了什么，AI 就不会学什么；你没打标什么，AI 就会把那个特征吸收到 LoRA 里。**

本文是 [LoRA 六大核心功能方向概述](./lora-functionality-overview.md) 中"画风 (Style) LoRA"的具体实战展开。

---

## 目录

1. [核心策略：反向剥离法](#1-核心策略反向剥离法-the-peeling-technique)
2. [触发词设计](#2-触发词设计-trigger-word-strategy)
3. [针对"国风"元素的处理](#3-针对国风元素的处理技巧)
4. [针对"三维"光影的处理](#4-针对三维光影的处理)
5. [数据集构成建议](#5-数据集构成建议)
6. [实战打标示范（多例对比）](#6-实战打标示范多例对比)
7. [常见错误与排查](#7-常见错误与排查)
8. [Gemini 自动打标 Prompt 模板](#8-gemini-自动打标-prompt-模板)

---

## 1. 核心策略：反向剥离法 (The "Peeling" Technique)

对于风格 LoRA，我们需要让 AI 学习"怎么画（渲染质感、光影、材质）"，而不是"画什么（具体的女孩、特定的汉服）"。

想象你在"剥洋葱"：把每一层可见内容（人物、服装、道具、背景）都用标签描述清楚、剥离出去，最后剩下的那个无法用语言描述的"氛围感"和"质感"，就是 LoRA 会学到的东西。

### 不要打标的（你希望 LoRA 学到的）

这些特征不写进标签，AI 就会把它们归因到 LoRA 权重（或触发词）上：

| 类别 | 具体关键词示例 | 不打标的理由 |
|------|--------------|-------------|
| 渲染方式 | `3D render`, `Octane render`, `C4D`, `Blender`, `unreal engine 5` | 你希望 LoRA 自带渲染质感 |
| 材质质感 | `clay material`, `plastic`, `porcelain`, `matte finish` | 你希望 LoRA 自带材质 |
| 盲盒/手办审美 | `blind box`, `Pop Mart`, `figurine`, `toy` | 你希望 LoRA 自带这种审美风格 |
| 光影特征 | `soft lighting`, `subsurface scattering`, `global illumination` | 你希望 LoRA 自带这种光感 |
| 通用画质词 | `best quality`, `masterpiece`, `8k` | 这些是噪声标签，对风格学习没有贡献 |

**原理：** 如果你给每张图都打了 `3D render`，AI 会认为"只有当用户输入 `3D render` 时我才画成这样"。如果你不打这些标，但给了一个触发词（比如 `GF3D`），那么用户只要输入 `GF3D`，AI 就会自动把画面变成这种 3D 质感。

### 要详细打标的（你不希望 LoRA 绑死的）

这些特征写进标签，AI 就会认为它们是"可变的内容"，而非风格的一部分：

| 类别 | 具体关键词示例 | 打标的理由 |
|------|--------------|-----------|
| 人物基础 | `1girl`, `1boy`, `solo` | 不打的话 LoRA 会锁死人物数量 |
| 服装 | `hanfu`, `armor`, `school uniform` | 不打的话 LoRA 会锁死某件衣服 |
| 动作 | `holding fan`, `sitting`, `running` | 不打的话 LoRA 会锁死某个姿势 |
| 发型/发色 | `long hair`, `black hair`, `hair bun` | 不打的话 LoRA 会锁死某种发型 |
| 表情 | `smile`, `closed eyes`, `crying` | 不打的话 LoRA 会锁死某个表情 |

**理由：** 你必须告诉 AI 画面里是个"穿汉服的女孩"。如果你不打 `hanfu`，AI 会误以为"国风三维风格 = 必须穿这件特定的衣服"。你需要让 AI 学会的是："在这个风格下，**任何**衣服的布料材质应该是这样的反光，**任何**头发都该是这样的建模质感。"

---

## 2. 触发词设计 (Trigger Word Strategy)

触发词是用户在生图时调用 LoRA 风格的"开关"。设计得好，LoRA 的易用性会大幅提升。

### 基本原则

| 原则 | 好的触发词 | 差的触发词 | 原因 |
|------|----------|----------|------|
| 独一无二 | `GF3D`, `guofeng3d_v2` | `3D style`, `chinese` | 常见词会和底模已有概念冲突 |
| 简短好记 | `GF3D` | `guofeng_three_dimensional_render_style` | 实际使用时需要手打 |
| 无歧义 | `gf3d_style` | `gf` | 太短可能和其他 LoRA 冲突 |

### 触发词的放置

训练时，触发词应该出现在**每条标签的最前面**：

```
GF3D, 1girl, hanfu, holding fan, long hair, ...
```

这样训练后，模型会建立"看到 GF3D → 启用这套渲染风格"的强关联。

### 进阶：多触发词分级

如果你的数据集内部存在明显子类别（例如同时有 Q 版和正常比例的图），可以使用分级触发词：

```
主触发词：GF3D              → 启用国风三维的核心质感
子触发词：GF3D_chibi         → 启用 Q 版比例
子触发词：GF3D_realistic     → 启用偏写实的比例
```

在打标时，Q 版图片写 `GF3D, GF3D_chibi, ...`，正常比例图片写 `GF3D, GF3D_realistic, ...`。这样用户可以精细控制。

---

## 3. 针对"国风"元素的处理技巧

国风三维往往包含大量复杂的装饰（如头饰、刺绣、流苏）。对这些元素的打标策略直接决定 LoRA 的灵活度。

### 流派 A：泛化流（推荐新手 & 通用画风）

- **做法：** 详细打标具体的配饰，如 `hair ornament`, `tassel`（流苏）, `jade pendant`（玉佩）, `embroidery`（刺绣）, `gold trim`（金边）
- **效果：** LoRA 非常灵活。用户以后让它画"穿西装的女孩"，它也能用"国风三维"的材质渲染出来，而不会强行加上古风头饰
- **适用场景：** 想做一个通用的"国风 3D 渲染器"，搭配任何内容都好看

### 流派 B：固化流（适合做特定 IP）

- **做法：** 不打标那些复杂的国风元素。只打 `1girl`, `dress`
- **效果：** LoRA 会死记硬背那些复杂的头饰和刺绣。以后用户不管画什么，AI 都会忍不住往上加流苏和金饰
- **适用场景：** 做特定角色的盲盒（比如《王者荣耀》某角色的 Q 版）、固定 IP 周边

### 流派选择决策表

| 维度 | 泛化流 A | 固化流 B |
|------|---------|---------|
| **目标** | 通用画风，可搭配任意内容 | 固定 IP/角色，保持造型一致 |
| **打标精度** | 高（配饰全标注） | 低（只标基础信息） |
| **LoRA 灵活性** | 高 — 风格可迁移到任何题材 | 低 — 生成物总带国风装饰 |
| **训练难度** | 较高（打标工作量大） | 较低（打标很简单） |
| **适合发布到** | Civitai 等公共平台 | 团队内部/特定项目 |

### 流派 C：混合流（进阶玩家）

实际上，你可以在同一个数据集中**混合使用**两种策略：

- 大部分图片用泛化流（详细打标配饰）
- 少量"标志性造型"的图片用固化流（只写基础标签 + 一个专属触发词如 `GF3D_signature`）

这样用户既能用 `GF3D` 获得灵活的风格，又能用 `GF3D_signature` 直接呼出你的标志性造型。

---

## 4. 针对"三维"光影的处理

这是国风三维最迷人的地方：通常是通透的皮肤（SSS 次表面散射材质）+ 柔和的全局光照 + 微微发光的边缘光。

### 按素材类型区分打标策略

**纯色背景素材（如盲盒图、证件照式）：**

```
推荐打标：simple background, white background（或 gradient background）
不要打标：studio lighting, soft shadow
```

- 打标背景类型，让 AI 学会把人物从背景里剥离出来
- 光影效果不打标，留给 LoRA 学习

**复杂场景素材（如亭台楼阁、花园）：**

```
推荐打标：pavilion, lanterns, cherry blossoms, night, depth of field, outdoors
不要打标：volumetric lighting, ray tracing, ambient occlusion
```

- 必须详细描述背景**内容**（有什么东西），但不描述**渲染方式**（用了什么技术画出来的）
- 不描述背景内容的话，AI 会把特定场景绑定到风格里（一用 LoRA 就出凉亭）

### 关键禁区

以下词汇在国风三维 LoRA 的标签中**绝对不能出现**：

| 禁止使用 | 原因 |
|----------|------|
| `photorealistic`, `realistic` | 我们要的是"三维渲染感"，不是"真人照片感"。不打这些词，AI 会学到"介于真人与手办之间"的特殊质感 |
| `anime`, `cartoon`, `illustration` | 同理，国风三维不是二次元。打了这些词反而会把质感推向平面 |
| `painting`, `watercolor`, `oil painting` | 这些会引入传统绘画的笔触感，破坏 3D 材质的学习 |

**核心思路：** 不打任何"媒介描述"类标签。既不说它是照片，也不说它是动画，也不说它是 3D。让 LoRA 自己成为这个"媒介"的定义。

---

## 5. 数据集构成建议

打标策略再好，数据集本身质量不行也白搭。以下是针对国风三维风格的数据集组建建议。

### 数量与多样性

| 维度 | 建议 |
|------|------|
| **总图片数** | 20~50 张（风格 LoRA 不需要太多，但每张质量要高） |
| **风格一致性** | 所有图片必须出自同一种渲染风格，不要混入 2D 插画 |
| **内容多样性** | 尽量覆盖不同人物、不同服装、不同动作、不同背景 |
| **比例一致性** | 如果全是 Q 版（chibi），就统一 Q 版；如果全是正常比例，就统一正常比例。不要混着来（除非用子触发词区分） |

### "全集 Q 版"数据集的 chibi 打标问题

这是一个容易犯的错误：

> 如果你的数据集**全部**都是 Q 版比例的图，**不要**给每张图都打 `chibi`。

原因：当 100% 的图都打了 `chibi`，AI 会认为"Q 版比例 = 当用户输入 chibi 时才启用的特征"。但你其实希望用户只输入触发词 `GF3D` 就自动出 Q 版比例。所以应该让这个比例特征通过 LoRA 学到，而非通过标签学到。

反过来，如果你的数据集**混合了** Q 版和正常比例的图，那就**必须**打 `chibi` 来区分，否则 LoRA 会在两种比例之间摇摆不定。

**通用规则：** 数据集中 90% 以上的图片都有的某个特征，如果你希望它成为 LoRA 的固有属性，就不要打标它。这条规则不只适用于 `chibi`，也适用于：

- 全部是女性角色 → 不打 `1girl`（LoRA 默认出女性）
- 全部是正面照 → 不打 `looking at viewer`（LoRA 默认正面）
- 全部是白色背景 → 不打 `white background`（LoRA 默认白背景）

但要注意：这会让 LoRA 的对应特征变得"固执"。不打 `1girl`，以后想出 `1boy` 会变困难。所以这取决于你的目标。

### 分辨率建议

| 训练框架 | 推荐分辨率 |
|----------|-----------|
| SD 1.5 | 512×512 或 512×768 |
| SDXL | 1024×1024 或 1024×768 |
| 混合比例 | 使用 bucket（分桶）训练，让框架自动处理不同比例 |

确保素材的实际分辨率**不低于**训练分辨率。放大（upscale）过的图片质量往往不如原生高分辨率素材。

---

## 6. 实战打标示范（多例对比）

### 示例 A：Q 版盲盒图（简单背景）

**素材描述：** 一个 Q 版 3D 小女孩，穿着粉色汉服，手里提着兔子灯，背景是模糊的元宵节灯会，材质像泡泡玛特（Pop Mart）。

**假设：** 数据集全部是 Q 版比例，使用泛化流打标。

**正确打标：**

```
GF3D, 1girl, pink hanfu, holding lantern, rabbit lantern, hair bun,
tassel, hair ornament, gold trim, blurry background, lanterns, night,
festival, depth of field, smile, standing
```

**注意 `chibi` 没有出现** — 因为数据集 100% 都是 Q 版，我们让 LoRA 自己学到这个比例。

**故意不打标的（留给 LoRA 学习）：**

| 隐藏标签 | 归属 |
|----------|------|
| `3D render` | 渲染方式 → LoRA |
| `clay material` / `plastic` | 材质质感 → LoRA |
| `Pop Mart` / `blind box` | 盲盒审美 → LoRA |
| `soft lighting` / `subsurface scattering` | 光影特征 → LoRA |
| `chibi` / `big head` | Q 版比例 → LoRA（因为全集都是） |

---

### 示例 B：半写实场景图（复杂背景）

**素材描述：** 一个正常比例的 3D 少女，穿着白色仙鹤纹汉服，站在月下的石桥上，远处是层叠的飞檐亭台，水面有倒影，整体是偏冷调的月光渲染。

**假设：** 数据集混合了 Q 版和正常比例，使用泛化流打标。

**正确打标：**

```
GF3D, GF3D_realistic, 1girl, white hanfu, crane embroidery, long sleeves,
wide sleeves, black hair, hair ornament, jade hairpin, standing,
stone bridge, pavilion, moonlight, night, water, reflection,
pagoda, mountains, depth of field, cool tones
```

**分析：**

- `GF3D_realistic` — 子触发词，标记正常比例（因为数据集混合了两种比例）
- `crane embroidery`, `jade hairpin` — 泛化流，详细打标配饰
- `stone bridge`, `pavilion`, `moonlight` — 详细描述背景**内容**
- `cool tones` — 打了色调标签，让 LoRA 在色调上保持灵活（否则 LoRA 会锁死冷色调）
- **没有** `volumetric lighting`, `ray tracing`, `atmospheric` — 渲染技术不打标

---

### 示例 C：固化流对比（同一张图的不同打法）

用示例 A 同一张图，但改用固化流：

```
GF3D, 1girl, pink dress, holding object, blurry background, night, smile
```

**对比：**

| 标签 | 泛化流写法 | 固化流写法 |
|------|-----------|-----------|
| 服装 | `pink hanfu`（明确是汉服） | `pink dress`（模糊为裙子） |
| 手持物 | `holding lantern, rabbit lantern` | `holding object` |
| 配饰 | `hair bun, tassel, hair ornament, gold trim` | （完全不打） |
| 效果 | LoRA 灵活，配饰可控 | LoRA 固执，自带全套配饰 |

---

## 7. 常见错误与排查

### 错误 1：LoRA 出图总是同一个人

**症状：** 不管怎么改提示词，生成的人物长得都一样。

**原因：** 数据集里人物不够多样，且没有充分打标人物特征。

**修复：**
- 确保数据集至少包含 5 种以上不同的人物外观
- 给每张图详细打标人物特征：发色、发型、瞳色、脸型
- 如果数据集确实全是同一个角色（比如从某个 3D 模型渲染的），那就接受"这个 LoRA 会锁死长相"的事实，或者额外寻找不同角色的同风格素材

### 错误 2：LoRA 效果太弱/几乎没有效果

**症状：** 加了 LoRA 和没加几乎看不出区别。

**原因：** 打标过于详细，把风格特征也描述进去了。AI 从标签里就能还原画面，不需要从 LoRA 里学任何东西。

**修复：**
- 检查标签里是否出现了 `3D`, `render`, `plastic`, `clay` 等渲染相关词
- 检查标签里是否出现了 `soft lighting`, `glow`, `rim light` 等光影相关词
- 删掉这些标签，重新训练

### 错误 3：LoRA 出图总带特定背景/物件

**症状：** 不管提示词怎么写，画面里总会出现灯笼/凉亭/樱花。

**原因：** 数据集的背景/物件不够多样，又没有打标这些元素。

**修复：**
- 方案 A：给这些反复出现的背景元素打上标签（如 `lanterns`, `pavilion`），让 AI 知道它们是内容而非风格
- 方案 B：增加更多不同背景的素材，稀释特定背景的影响

### 错误 4：LoRA 和底模冲突，出图崩坏

**症状：** 画面出现诡异的混合效果，既不像原风格也不像 LoRA。

**原因：** LoRA 权重太高，或者底模和训练时使用的底模差异太大。

**修复：**
- 降低 LoRA 权重（从 1.0 降到 0.6~0.8）
- 确保出图使用的底模和训练时使用的底模是同一个（或同系列）
- 如果用 SDXL 训练的 LoRA，不要在 SD 1.5 上使用

---

## 8. Gemini 自动打标 Prompt 模板

当你使用 Gemini Vision API（或其他多模态 AI）辅助打标时，可以使用以下 Prompt。

### 泛化流模板（推荐）

```
你是一个 Stable Diffusion 训练数据标注专家。请为这张图片生成训练用的标签（tags）。

输出要求：
- 格式：逗号分隔的英文短标签（Booru 风格），不要自然语言长句
- 标签数量：15~30 个
- 第一个标签固定为：GF3D

必须描述的内容（详细标注）：
- 人物数量和性别（1girl, 1boy, multiple girls, etc.）
- 发型和发色（long hair, black hair, twin tails, etc.）
- 服装的具体类型和颜色（pink hanfu, white dress, armor, etc.）
- 配饰细节（hair ornament, tassel, earrings, jade pendant, etc.）
- 动作和姿势（standing, sitting, holding fan, arms up, etc.）
- 表情（smile, closed eyes, serious, etc.）
- 背景内容（具体物件：pavilion, lanterns, bridge, etc.）
- 如果背景是纯色/简单，标记 simple background 加颜色

绝对禁止出现的标签（这些留给 LoRA 学习）：
- 渲染引擎/方式：3D, 3D render, CGI, Octane, C4D, Blender, unreal engine
- 材质描述：clay, plastic, porcelain, matte, glossy, PVC
- 手办/盲盒：blind box, Pop Mart, figurine, toy, chibi figure
- 光影技术：soft lighting, subsurface scattering, global illumination, ray tracing, rim light
- 画质/媒介：masterpiece, best quality, photorealistic, realistic, anime, cartoon, illustration, painting
- 风格标签：3D style, render style, cute style
```

### 固化流模板

```
你是一个 Stable Diffusion 训练数据标注专家。请为这张图片生成训练用的标签（tags）。

输出要求：
- 格式：逗号分隔的英文短标签（Booru 风格）
- 标签数量：5~10 个（尽量精简）
- 第一个标签固定为：GF3D

只需描述：
- 人物数量和性别
- 服装大类（dress, suit, armor — 不要细节）
- 核心动作（standing, sitting — 不要细节）
- 背景大类（simple background, outdoors, indoors）

不要描述：
- 配饰细节（头饰、首饰、刺绣图案等）
- 渲染/材质/光影相关的一切
- 画质/媒介描述
```

### Prompt 使用建议

| 场景 | 选择 |
|------|------|
| 数据集 > 30 张，追求灵活性 | 泛化流模板 |
| 数据集 < 20 张，做特定 IP | 固化流模板 |
| 混合数据集 | 大部分图用泛化流，标志造型用固化流 |

---

## 附录：打标自查清单

训练前，逐条过一遍你的标签文件：

- [ ] 触发词是否在每条标签的最前面？
- [ ] 标签中是否**没有**出现任何渲染引擎名称（3D, C4D, Octane...）？
- [ ] 标签中是否**没有**出现材质描述词（clay, plastic, porcelain...）？
- [ ] 标签中是否**没有**出现 `photorealistic`, `realistic`, `anime`, `cartoon`？
- [ ] 标签中是否**没有**出现 `masterpiece`, `best quality` 等画质词？
- [ ] 全集共有的特征（如 Q 版比例）是否**没有**被打标？
- [ ] 每张图的服装/配饰/动作是否都有**具体描述**（泛化流）？
- [ ] 纯色背景的图是否标记了 `simple background`？
- [ ] 复杂背景的图是否详细描述了**背景中的物件**？
- [ ] 标签格式是否统一（全英文、逗号分隔、无多余空格）？
