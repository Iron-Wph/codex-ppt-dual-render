# 项目迁移与 GitHub 保存指南

## 1. 保存范围

Git 仓库保存所有不可替代、需要协作和需要版本控制的内容：

- `src/`、`schemas/`、`test/`、`examples/`；
- `SKILL.md` 与 `skill-references/`；
- `themes/` 与主题参考图；
- 产品、需求、技术、调研和运行文档；
- `package.json` 与 `package-lock.json`；
- `dist/real-paper-v2/` 真实论文验收基准；
- `dist/theme-gallery/` 主题总览基准；
- GitHub Actions 和 Agent 交接文档。

以下内容不进入 Git 历史：

- `node_modules/`：体积大，由 `npm ci` 精确重建；
- 其他历史 `dist/*`：属于重复构建缓存，完整本地归档会保存，但 GitHub 主仓库不保存每次重复运行；
- Codex 登录状态、`.env`、`config/local.json`、临时文件和账号凭据；
- 用户私人论文原件。基准产物包含论文摘录时，仓库应保持私有。

## 2. 创建完整本地迁移包

该归档额外包含所有历史 `dist` 运行结果，但排除 `.git` 和可重建的 `node_modules`：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-migration-archive.ps1
```

脚本会在仓库同级目录创建：

```text
codex-ppt-full-YYYYMMDD-HHMMSS.zip
```

Git 历史使用独立 bundle 保存：

```powershell
git bundle create ..\codex-ppt-history.bundle --all
git bundle verify ..\codex-ppt-history.bundle
```

ZIP 保存完整工作目录，bundle 保存分支和提交历史，两者配合可在没有 GitHub 时完成离线迁移。

## 3. 创建 GitHub 私有仓库

推荐创建私有仓库，例如 `codex-ppt-dual-render`。在 GitHub 网页创建空仓库时，不要自动生成 README、License 或 `.gitignore`。

配置并推送：

```powershell
git remote add origin https://github.com/<owner>/codex-ppt-dual-render.git
git push -u origin codex/migration-checkpoint
```

若以后安装 GitHub CLI：

```powershell
gh auth login
gh repo create codex-ppt-dual-render --private --source . --remote origin --push
```

完整历史 ZIP 不建议提交到 Git。若确有跨设备保存需求，优先作为私有 GitHub Release 附件，或存放到受控的对象存储；上传前再次检查论文版权、隐私和 Codex 提示日志。

## 4. 在新机器恢复

### 从 GitHub 恢复

```powershell
git clone https://github.com/<owner>/codex-ppt-dual-render.git
Set-Location codex-ppt-dual-render
git switch codex/migration-checkpoint
npm ci
npm run verify
```

本地 Codex 需要单独登录：

```powershell
codex login
```

如果目标机器安装 MinerU，可运行论文模式验证；没有 MinerU 时系统会按配置使用 PyMuPDF 回退。

### 从 bundle 恢复

```powershell
git clone ..\codex-ppt-history.bundle PPT制作
Set-Location PPT制作
git switch codex/migration-checkpoint
npm ci
npm run verify
```

需要全部历史构建结果时，再把 ZIP 解压到该目录。

## 5. 恢复后的完整性检查

```powershell
npm run verify
node src/cli.mjs qa --input dist/real-paper-v2 --format both
```

期望结果：

- 4 个测试文件全部通过；
- `deck.spec.json` Schema 校验通过；
- 基准 QA 为 0 error / 0 warning；
- `dist/real-paper-v2/presentation.html` 和 `presentation.pptx` 存在；
- `dist/real-paper-v2/codex/review.json` 的状态为 `pass`。

## 6. 迁移后的日常同步

```powershell
git status
npm run verify
git add -A
git commit -m "<type>: <summary>"
git push
```

每个里程碑同步更新 `PROJECT_STATUS.md`。改变项目开发约束、目录或验证方式时同步更新 `AGENTS.md`。
