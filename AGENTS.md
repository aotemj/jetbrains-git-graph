# AGENTS.md

可以查看readme-dev.md查看项目基本情况和要求
每次会话完后，如果改动了代码，都将插件编译安装到本地

## 编译安装命令

每次修改代码后，执行以下命令编译并安装插件到本地 VS Code：

```bash
# 1. 编译 extension + webview
pnpm run build

# 2. 打包成 .vsix
vsce package --no-dependencies

# 3. 安装到本地 VS Code
code --install-extension idea-like-git-graph-0.4.14.vsix --force
```

安装完成后，在 VS Code 中按 `Ctrl+Shift+P` → `Developer: Reload Window` 重新加载窗口即可生效。
