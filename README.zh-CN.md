# ClubDAO

[English README](README.md)

ClubDAO 是一个基于 React + TypeScript + Vite 的社团活动与聊天平台。
支持活动发布、加入、房间聊天、成员资料查看、通知和基础管理能力。

## 功能概览

- 用户名 + 密码的注册/登录流程
- 活动广场（搜索与分类筛选）
- 发布/加入/退出/取消/完成活动
- 房间可视化座位区与成员档案查看
- 房间聊天与全局广场聊天
- 通知中心与消息跳转
- 活动二维码海报生成与分享
- 基础 Admin 活动管理能力

## 技术栈

- React 19
- TypeScript
- Vite 7
- Tailwind CSS
- laf-client-sdk（云函数调用）

## 项目结构

```text
src/
  App.tsx                  # 主业务逻辑与页面
  main.tsx                 # 入口渲染
  index.css                # 全局样式与动画
  components/
    AnnouncementModal.tsx
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

### 3. 生产构建

```bash
npm run build
```

### 4. 预览构建产物

```bash
npm run preview
```

## 后端依赖说明

前端通过 `laf-client-sdk` 在 `src/App.tsx` 内调用云函数。
当前 `baseUrl` 是写在代码里的：

- `src/App.tsx`

如果你要接入自己的后端，请同步修改该地址和云函数接口契约。

## 可用脚本

- `npm run dev` 本地开发
- `npm run build` 类型检查 + 构建
- `npm run lint` 代码检查
- `npm run preview` 预览产物

## 已知限制

- 核心业务逻辑仍集中在 `src/App.tsx`（文件较大）。
- 前后端接口契约目前主要依赖运行时返回，仍需进一步做更强的共享类型约束。
- 云端 `baseUrl` 目前仍写在 `src/App.tsx`，后续应迁移到环境变量配置。

## 备注

- 当前仓库以产品快速迭代为主。
- `src/App.tsx` 目前为集中式实现，后续可按模块逐步拆分。
