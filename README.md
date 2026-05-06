<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/95952d51-7b08-401f-9b86-665d1dd033f4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. 
## 最近更新记录

### UI & UX 优化
- **训练详情页重构**：
  - 采用更紧凑的布局设计，减少空间浪费。
  - 封面图调整为 1:1 比例，支持点击查看全图。
  - 训练项目列表新增 odd/even 隔行变色风格，提升阅读体验。
  - 肌肉分布示意图（Body Muscle Highlighter）移动至项目列表头部。
  - 统一使用用户名展示，替代头像区域。
- **历史记录优化**：
  - 移除了历史列表中的媒体预览，使历史记录更像一份纯净的日志。

### 功能增强
- **全屏查看**：在详情页点击封面图可进入沉浸式全屏预览模式。
- **数据一致性**：统一了全站的用户名/昵称显示逻辑。
