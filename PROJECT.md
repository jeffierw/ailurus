# Ailurus — 创作者订阅平台

> **Sui Overflow 2026** · Walrus Track  
> 面向全球 Web2 用户的创作者内容平台 — Google 登录即用，USDC 订阅，零 gas 感知。

---

## 一句话

**Ailurus**（小熊猫，拉丁名 *Ailurus fulgens*）是一个让创作者通过 USDC 订阅变现、粉丝一键解锁独家内容的去中心化平台。用户只需 Google 登录；链上身份、存储、付费墙与结算全部由 Sui 全栈 silently 完成。

---

## 解决的问题

| 痛点 | 现状 | Ailurus 方案 |
|------|------|--------------|
| 创作者平台抽成高 | OnlyFans 等平台抽成 20%+ | 链上合约透明分账，创作者自持 USDC |
| Web3 门槛高 | 助记词、gas、多代币 | Enoki Google 登录 + 赞助 gas，用户只见 USDC |
| 内容隐私与所有权 | 中心化存储、平台可封号删内容 | Walrus 去中心化存储 + Seal 加密订阅墙 |
| 跨境支付复杂 | 法币通道受限 | 链上 USDC 全球可达 |

---

## 目标用户

- **创作者**：摄影师、插画师、短片作者、独立音乐人 — 希望拥有内容主权、以稳定币收款
- **粉丝**：习惯 Instagram / Threads 浏览体验 — 不愿接触钱包与 gas，愿用 USDC 订阅支持创作者

---

## 核心功能（MVP）

### 粉丝侧
- Google 一键登录（Enoki zkLogin）
- 浏览创作者主页与内容 Feed
- 使用 **USDC** 按月订阅创作者
- 订阅后自动解锁加密内容（Seal）

### 创作者侧
- Google 登录创建创作者主页
- 充值 **USDC** 余额（链上稳定币）
- 上传图片集 / 短片集（平台后台 USDC→WAL 兑换 + Walrus 存储）
- 设定订阅价格（USDC/月）
- 查看订阅者与收入

### 用户无感知的链上能力
- **Enoki**：身份 + 赞助全部 SUI gas
- **Cetus Aggregator**：创作者 USDC 内部兑换为 WAL 支付存储费
- **Walrus**：加密内容 blob 存储
- **Seal**：订阅付费墙与解密策略
- **Move**：Profile、Post、Service、Subscription 链上状态

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│  React + TypeScript + Tailwind  (Web2 体验层)            │
│  Google 登录 · USDC 余额 · Feed · 上传 · 订阅           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Enoki (zkLogin + Sponsored Gas)                        │
│  Cetus Aggregator (USDC → WAL)                          │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Sui Move          Walrus              Seal             │
│  订阅/分账/元数据   加密内容存储        订阅解密策略      │
└─────────────────────────────────────────────────────────┘
```

---

## Overflow 2026 赛道

**主赛道：Walrus Track**

理由：核心价值是创作者加密内容的大容量去中心化存储，Walrus + Seal 是产品主干的差异化能力。

使用的 Sui 全栈：

| 组件 | 用途 |
|------|------|
| Enoki | OAuth 身份、赞助 gas |
| Walrus | 图片集/短片集 blob 存储 |
| Seal | 订阅付费墙、内容加密 |
| Move | USDC 订阅合约、创作者 Profile |
| Cetus Aggregator | USDC→WAL 流动性（用户无感） |

---

## 对齐评审标准（Judging Criteria）

依据 [Overflow 2026 Handbook](https://mystenlabs.notion.site/overflow-2026-handbook) 与官方评审维度：

### 1. 产品体验（Product Experience）— 约 50% 权重侧重「真实世界应用」

| 评审关注点 | Ailurus 如何回应 |
|------------|------------------|
| 可用性与打磨 | Instagram/Threads 风格 UI，熟悉的信息流与创作者主页 |
| 真实用户场景 | 创作者变现 + 粉丝订阅 — 已被 OnlyFans/Patreon 验证的商业模式 |
| 零 Web3 摩擦 | 无 gas、无助记词、无 WAL 概念；仅「Google 登录」与「USDC」 |
| 端到端闭环 | 注册 → 充值 → 上传 → 定价 → 粉丝订阅 → 解锁内容 |

**Demo 叙事**：5 分钟结构 — 问题（平台抽成+隐私）→ 方案（Ailurus）→ 现场演示（登录/订阅/解锁）→ 为何 Sui（Walrus+Seal+Enoki）→ 路线图（mainnet）

### 2. 解决问题（Problem Solving）

| 评审关注点 | Ailurus 如何回应 |
|------------|------------------|
| 有意义的问题 | 创作者经济与内容主权是千亿级市场 |
| 市场相关性 | 对标 OnlyFans/Patreon，差异化在链上所有权与 USDC 结算 |
| 长期价值 | 合约可组合：打赏、NFT 通行证、跨平台 Enoki Connect 身份 |

### 3. 技术质量（Technical Quality）

| 评审关注点 | Ailurus 如何回应 |
|------------|------------------|
| Sui 深度整合 | 非「贴链」— Enoki + Walrus SDK + Seal subscription + Move USDC 合约 |
| 可靠性 | Seal 官方 subscription 模式；Walrus 内容寻址完整性 |
| 工程深度 | PTB 编排（Cetus swap + Walrus register/certify）、Enoki 赞助白名单 |

### 4. 表达与愿景（Vision & Storytelling）

| 评审关注点 | Ailurus 如何回应 |
|------------|------------------|
| 清晰叙事 | 「小熊猫守护创作者内容」— 温暖、去中心化、用户主权 |
| 长期愿景 | 全球 Web2 创作者的链上主页 — 身份可移植、内容不可审查 |
| Mainnet 路径 | 黑客松 testnet MVP → 8/27 前 mainnet 部署（50/50 奖金结构） |

---

## 什么让 Ailurus 成为 Strong Overflow Project

依据 Overflow 强调的 **production-ready, real-world apps**（非 toy demo）：

1. **真实商业模式** — 订阅制已被市场验证，不是纯技术炫技
2. **完整 Sui 栈** — 身份（Enoki）+ 存储（Walrus）+ 隐私（Seal）+ 结算（Move USDC）+ 流动性（Cetus）
3. **Web2 优先** — 评委与用户体验视角都是「能用的产品」，不是「能跑的合约」
4. **Walrus Track 天然契合** — 媒体内容是大 blob 场景的最佳示范
5. **可演示的 Aha moment** — 粉丝 Google 登录 → 付 USDC → 秒解锁创作者独家图集
6. **Mainnet 可行** — USDC、Cetus、Walrus、Enoki 均支持 mainnet 路径

---

## 代币与经济模型（用户视角）

| 角色 | 看到 | 链上实际 |
|------|------|----------|
| 粉丝 | USDC 订阅价 | USDC → 创作者地址 |
| 创作者 | USDC 余额 / 收入 | 链上 USDC Coin |
| 所有人 | 无 gas 费 | Enoki 赞助 SUI |
| 创作者上传 | 「约 $0.xx USDC」 | 后台 Cetus USDC→WAL + Walrus 存储 |

---

## 路线图

### Phase 1 — 黑客松 MVP（当前）
- [x] UI 原型（React，路由/弹窗/Toast）
- [ ] Enoki Google 登录
- [ ] Move USDC 订阅合约
- [ ] Seal 加密 + 订阅解锁
- [ ] Walrus 上传管线（Cetus + SDK）
- [ ] Enoki 赞助 gas

### Phase 2 — Mainnet（2026.08 前）
- Mainnet 部署 Move 合约
- Enoki mainnet 配置
- 创作者 onboarding 与合规提示

### Phase 3 — 增长
- 多 OAuth 提供商（Apple、Twitch）
- 创作者数据分析
- 推荐 Feed 算法

---

## 团队与仓库

- **项目名**：Ailurus
- **前端**：`ailurus-web/` — React + TypeScript + Tailwind CSS
- **合约**：（待建）`contracts/`
- **参赛提交**：[overflow.sui.io](https://overflow.sui.io/)

---

## 参考资源

- [Overflow 2026 Handbook](https://mystenlabs.notion.site/overflow-2026-handbook)
- [Enoki Docs](https://docs.enoki.mystenlabs.com/)
- [Walrus Docs](https://docs.wal.app)
- [Seal Docs](https://seal-docs.wal.app)
- [Cetus Aggregator Skills](https://github.com/CetusProtocol/cetus-skills)
