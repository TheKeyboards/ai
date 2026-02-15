# 画风 LoRA 打标实战：国风三维 (Guofeng 3D)

训练"画风（Style）"类 LoRA，尤其是像"国风三维（Guofeng 3D）"这种既有特定审美（国风）又有特定材质（三维渲染）的复合风格，打标策略是成败的关键。

核心逻辑：

> **你打标了什么，AI 就不会学什么；你没打标什么，AI 就会把那个特征吸收到 LoRA 里。**

---

## 1. 核心策略：反向剥离法 (The "Peeling" Technique)

对于风格 LoRA，我们需要让 AI 学习"怎么画（渲染质感、光影、材质）"，而不是"画什么（具体的女孩、特定的汉服）"。

### 不要打标的（你希望 LoRA 学到的）

- **渲染关键词：** 如 `3D render`, `Octane render`, `C4D`, `Blender`, `unreal engine 5`, `clay material`（黏土材质）, `blind box`（盲盒质感）
- **理由：** 如果你给每张图都打了 `3D render`，AI 会认为"只有当用户输入 `3D render` 时我才画成这样"。如果你不打这些标，但给了一个触发词（Trigger Word，比如 `GF3D`），那么用户只要输入 `GF3D`，AI 就会自动把画面变成这种 3D 质感。

### 要详细打标的（你不希望 LoRA 绑死的）

- **画面内容：** `1girl`, `hanfu`（汉服）, `holding fan`（持扇）, `long hair`, `flower hair ornament`（花朵发饰）
- **理由：** 你必须告诉 AI 画面里是个"穿汉服的女孩"。如果你不打 `hanfu`，AI 会误以为"国风三维风格 = 必须穿这件特定的衣服"。你需要让 AI 学会："在这个风格下，汉服的丝绸材质是这样的反光，头发是这样的建模质感。"

---

## 2. 针对"国风"元素的处理技巧

国风三维往往包含大量复杂的装饰（如头饰、刺绣）。这里有两个流派：

### 流派 A：泛化流（推荐新手）

- **做法：** 详细打标具体的配饰，如 `hair ornament`, `tassel`（流苏）, `jade pendant`（玉佩）
- **效果：** LoRA 会非常灵活。用户以后让它画"穿西装的女孩"，它也能用"国风三维"的材质画出来，而不会强行加上古风头饰。

### 流派 B：固化流（适合做特定 IP）

- **做法：** 不打标那些复杂的国风元素。只打 `1girl`, `dress`。
- **效果：** LoRA 会死记硬背那些复杂的头饰和刺绣。以后用户不管画什么，AI 都会忍不住往上加流苏和金饰。这适合做特定角色的盲盒（比如《王者荣耀》某角色的 Q 版）。

### 流派选择决策

| 目标 | 选择 | 打标精度 |
|------|------|---------|
| 通用画风，可搭配任意内容 | 泛化流 A | 高（配饰全标注） |
| 固定 IP/角色，保持造型一致 | 固化流 B | 低（只标基础信息） |

---

## 3. 针对"三维"光影的处理

这是国风三维最迷人的地方：通常是通透的皮肤（SSS 材质）+ 柔和的全局光照。

### 按素材类型区分

**纯色背景素材（如盲盒图、证件照式）：**
- 建议打标 `simple background`, `white background`
- 让 AI 学会把人物从背景里剥离出来

**复杂场景素材（如亭台楼阁）：**
- 必须详细描述背景：`pavilion`, `lanterns`, `night`, `depth of field`（景深）
- 不描述背景的话，AI 会把特定场景绑定到风格里

### 关键禁区

**千万不要打 `photorealistic` 或 `realistic`。**

因为我们要的是"三维渲染感"，而不是"真人照片感"。如果你不打这些词，AI 就会把这种"介于真人与手办之间"的特殊质感学进去。

---

## 4. 实战演练：打标示范

### 素材描述

一个 Q 版 3D 小女孩，穿着粉色汉服，手里提着兔子灯，背景是模糊的元宵节灯会，材质像泡泡玛特（Pop Mart）。

### 正确打标

```
1girl, chibi, pink hanfu, holding lantern, rabbit lantern, hair bun,
tassel, hair ornament, blurry background, lanterns, night, festival,
depth of field, smile, standing
```

### 故意不打标的（留给 LoRA 学习）

- `3D render` — 渲染方式归 LoRA
- `clay material` / `plastic` — 材质质感归 LoRA
- `Pop Mart` / `blind box` — 盲盒审美归 LoRA
- `soft lighting` / `subsurface scattering` — 光影特征归 LoRA
- `Octane` / `C4D` — 渲染引擎归 LoRA

---

## 5. Gemini 自动打标 Prompt 模板

当你使用 Gemini Vision API 辅助打标时，应该发送以下 System Prompt：

```
请详细描述画面中的人物、动作、衣着、物品和背景内容。

关键规则：
1. 忽略所有关于画风、材质、渲染引擎的描述（如 3D, C4D, Octane, Pop Mart, plastic, clay）。
2. 详细描述汉服的形制和配饰（如 hanfu, hair bun, tassel）。
3. 如果背景是纯色，必须标记 simple background。
4. 输出格式：逗号分隔的英文短标签，不要使用自然语言长句。
```

通过这种方式，LoRA 就会明白："只要用户输入 `GF3D`，我就要把所有的东西都变成这种'磨砂质感 + 柔光渲染'的样子！"

---

## 与其他文档的关系

- 本文是 [LoRA 六大核心功能方向概述](./lora-functionality-overview.md) 中"画风 (Style) LoRA"的具体实战展开
- 打标策略遵循概述文档中总结的核心原则："想让 LoRA 学什么就隐藏什么，不想学什么就详细描述什么"
