# Windows PowerShell 命令参考

## 📝 重要提示

PowerShell 与 Linux Bash 命令不同，**不能**使用以下语法：
- ❌ `mkdir dir1 dir2 dir3` （不支持一次创建多个目录）
- ❌ `touch file1 file2` （不支持一次创建多个文件）
- ❌ `rm -rf dir/*` （参数格式不同）

## ✅ 正确的 PowerShell 语法

### 创建目录

```powershell
# 方法 1：使用 New-Item（推荐）
New-Item -ItemType Directory -Path api,models,services,utils,temp,logs -Force

# 方法 2：分多次 mkdir
mkdir api
mkdir models
mkdir services

# 方法 3：使用 cd 组合
cd app
mkdir api
mkdir models
cd ..
```

### 创建文件

```powershell
# 方法 1：使用记事本
notepad filename.py

# 方法 2：使用 New-Item
New-Item -ItemType File -Path "filename.py" -Force

# 方法 3：使用 Out-File
echo "" | Out-File -FilePath "filename.py" -Encoding utf8
```

### 查看目录内容

```powershell
# 查看当前目录
ls

# 查看指定目录
ls backend\temp

# 递归查看
ls -Recurse
```

### 复制文件

```powershell
# 复制文件
Copy-Item source.txt destination.txt

# 复制文件夹
Copy-Item -Path src -Destination dest -Recurse
```

### 移动文件

```powershell
# 移动文件/文件夹
Move-Item -Path oldname -Destination newname
```

### 删除文件/文件夹

```powershell
# 删除文件
Remove-Item filename.txt

# 删除文件夹
Remove-Item -Path foldername -Recurse -Force
```

### 查看文件内容

```powershell
# 查看文件内容
Get-Content filename.txt

# 或使用简写
gc filename.txt

# 或使用 type（兼容别名）
type filename.txt
```

### 环境变量

```powershell
# 设置环境变量（当前会话）
$env:MY_VAR = "value"

# 查看环境变量
Get-ChildItem env:
```

### Git 命令（与 Bash 相同）

```powershell
git init
git add .
git commit -m "message"
git status
git log --oneline
```

### Python 虚拟环境

```powershell
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 如果权限错误，先执行：
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 然后再次激活
.\venv\Scripts\Activate.ps1

# 验证激活成功
# 命令行前会出现 (venv) 前缀
```

### Node.js 命令（与 Bash 相同）

```powershell
npm create vite@latest frontend -- --template react-ts
npm install
npm run dev
```

---

## 🔧 常用命令对照表

| Linux Bash | PowerShell | 说明 |
|------------|------------|------|
| `mkdir dir1 dir2` | `New-Item -ItemType Directory -Path dir1,dir2 -Force` | 创建多个目录 |
| `touch file.txt` | `notepad file.txt` 或 `New-Item -ItemType File -Path file.txt -Force` | 创建文件 |
| `ls` | `ls` 或 `Get-ChildItem` | 列出目录内容 |
| `cat file.txt` | `Get-Content file.txt` | 查看文件内容 |
| `rm -rf dir` | `Remove-Item -Path dir -Recurse -Force` | 删除文件夹 |
| `cp src dest` | `Copy-Item src dest` | 复制文件 |
| `mv src dest` | `Move-Item src dest` | 移动文件 |
| `source venv/bin/activate` | `.\venv\Scripts\Activate.ps1` | 激活 Python 虚拟环境 |

---

## ⚠️ 常见错误与解决方案

### 错误 1：找不到接受实际参数的位置形式参数

**错误信息：**
```
mkdir : 找不到接受实际参数"dir2"的位置形式参数。
```

**解决方案：**
```powershell
# ❌ 错误
mkdir dir1 dir2 dir3

# ✅ 正确
New-Item -ItemType Directory -Path dir1,dir2,dir3 -Force
```

### 错误 2：无法加载文件，因为此系统的执行脚本策略被禁用

**错误信息：**
```
无法加载文件 XXX.ps1，因为在此系统上禁止运行脚本。
```

**解决方案：**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 错误 3：pip 不是内部或外部命令

**解决方案：**
1. 确保已安装 Python
2. 确保已激活虚拟环境：`.\venv\Scripts\Activate.ps1`
3. 或者将 Python 添加到 PATH 环境变量

---

## 📋 项目初始化快速参考

```powershell
# 1. 创建项目目录
cd d:\Code\Cell
New-Item -ItemType Directory -Path backend,frontend -Force

# 2. 创建后端子目录
cd backend
New-Item -ItemType Directory -Path app,temp,logs,configs,exports,weights -Force
cd app
New-Item -ItemType Directory -Path api,models,services,utils -Force
cd ../../

# 3. 创建 .gitkeep 文件
New-Item -ItemType File -Path "backend\temp\.gitkeep" -Force
New-Item -ItemType File -Path "backend\logs\.gitkeep" -Force
New-Item -ItemType File -Path "backend\exports\.gitkeep" -Force
New-Item -ItemType File -Path "backend\configs\.gitkeep" -Force
New-Item -ItemType File -Path "backend\weights\.gitkeep" -Force

# 4. 初始化 Git
git init
git add .
git commit -m "Initial project structure"

# 5. 创建 Python 虚拟环境
cd backend
python -m venv venv

# 6. 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 7. 安装依赖
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 8. 启动后端服务
python -m uvicorn app.main:app --reload

# 9. 新开终端，启动前端
cd frontend
npm run dev
```

---

## 🎯 最佳实践

1. **使用 Tab 补全**：输入部分路径后按 Tab 键自动补全
2. **使用相对路径**：避免路径过长
3. **先 cd 再操作**：减少路径错误
4. **使用 -Force 参数**：强制覆盖已存在的文件/目录
5. **使用 UTF-8 编码**：避免中文乱码问题

---

**作者：** 卢伶利  
**更新时间：** 2026-03-07
