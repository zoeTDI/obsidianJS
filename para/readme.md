# 🏛️ PARA System Module - Automation & Templates

本文件夹是基于天生双链特性的 **PARA (Projects, Areas, Resources, Archives)** 知识管理系统模块。通过联动的脚本与模板，实现了元数据解耦、多维聚合索引、智能弹窗选择以及任务的一键状态流转，打造了全自动化的 PARA 系统属性流闭航。

## 📂 文件作用一览

```text
para/
├── data/
│   └── para_config.json          # ⚙️ 核心数据中心：集中管理状态、优先级、价值评价的美化字典与视图规则
├── scripts/
│   ├── paraLoadConfig.js       # 📁 工具脚本：供 Templater 调用，动态读取异步加载外部 JSON 配置字典
│   ├── paraGetFolderFile.js   # 🎯 工具脚本：供 Templater 调用，实现按 type 属性智能弹窗筛选 MOC 页面
│   └── paraActionArchive.js    # ⚡ 动作脚本：供 QuickAdd (Macro) 调用，无声修改 Frontmatter 一键归档任务
├── tp-PARA-任务.md               # 📝 模板文件：任务/项目（Project）新建模板，包含状态与优先级 Suggester
├── tp-PARA-资料.md               # 📝 模板文件：资料（Resource）新建模板，包含价值与主题 Suggester
├── tp-PARA-领域.md               # 📝 模板文件：领域（Area）新建模板，包含所属 MOC 智能绑定
└── tp-PARA-领域索引.md            # 📝 模板文件：地图/索引（MOC）模板，内置 DataviewJS 自动化多维聚合看板
```

## 🔧 关键配置与路径本地化修改指引 (重要)

由于每个人的 Obsidian 库文件夹命名各不相同，**在导入本模块后，请务必根据你的实际库结构修改以下硬编码路径及参数**：

### 1. ⚙️ 修改中央配置文件的存储路径

当您把 `para_config.json` 放到个人库中后，有两个文件需要更新它的读取路径：

**文件一：`scripts/paraLoadConfig.js`**

**示例代码**：
```JavaScript
const CONFIG_JSON_PATH = "template/data/para_config.json"; // 👈 改为你的实际存放路径
```

**文件二：`tp-PARA-领域索引.md` (DataviewJS 渲染引擎)**

**示例代码**：
```javascript
const jsonPath = "template/data/para_config.json"; // 👈 改为你的实际存放路径
```

### 2. 🎯 修改 MOC/领域的检索范围与默认值

在使用模板新建笔记时，系统会扫描特定文件夹下的 MOC 节点并弹窗。如果你的 MOC 目录不叫 `15-项目系统`，需要前往以下位置调整：

**全局默认配置：`scripts/para-get-folder-file.js`**

**示例代码**：
```javascript
async function paraGetFolderFile(tp, {
    targetFolder = "15-项目系统", // 👈 改为存放 PARA 笔记的实际文件夹
    typeValue = "moc",          // 👈 筛选 YAML 中 type 属性为什么值的笔记
    defaultValue = "未分类",     // 👈 用户取消选择时的保底值
    suggesterPlaceholder = "请选择一个 MOC 项目："
} = {})
```

**单模板覆盖配置：`tp-PARA-任务.md` / `tp-PARA-领域.md` / `tp-PARA-资料.md`**

**修改位置**：各模板文件顶部的 `tp.user.para-get-folder-file` 调用传参处。如果你在本地的参数和全局默认一致，甚至可以省去传参。

**示例代码**：
```javascript
const finalAreaValue = await tp.user.para-get-folder-file(tp, {
    targetFolder: "15-项目系统", // 👈 改为你的实际 MOC 目录
    typeValue: "moc"
});
```

### 3. 📊 修改 Dataview 动态检索的物理分区
**文件：`tp-PARA-资料.md`**

**修改位置**：底部的 Dataview 行（用于反向寻找有哪些项目引用了此资料）。

**示例代码**：
```markdown
LIST FROM "15-项目系统" WHERE contains(related_resources, this.file.link) AND type = "Project"
```

*(📌 请将 `"15-项目系统"` 修改为你的整个 PARA 系统笔记所在的根文件夹或核心分区路径。)*

## 🚀 部署与使用指引

### 1. 放置配置文件与 JS 脚本
1. 将 `para_config.json` 放置在你的配置数据夹中。
2. 将 `scripts/` 下的 3 个 `.js` 文件放置在你的 Templater 脚本文件夹中。

### 2. 插件端配置绑定
**Templater 注册**：  
在 Templater 设置中开启 `User Script Functions` 并指向你的脚本文件夹。

**QuickAdd 动作绑定**：
setup 1：注意将类型选择为`Macro`
![](https://ob-tc-caldm-1315806820.cos.ap-nanjing.myqcloud.com/img/20260620135948297.png)

setup 可选：将命令注册为全局命令
![](https://ob-tc-caldm-1315806820.cos.ap-nanjing.myqcloud.com/img/20260620135948298.png)

setup 2：选择`paraActionArchive`

如果此处没有显示，请检查之前的js路径配置是否正确，如果路径正确，检查quickAdd的设置

![](https://ob-tc-caldm-1315806820.cos.ap-nanjing.myqcloud.com/img/20260620135948299.png)

setup 3：选择后点击“Add”添加
![](https://ob-tc-caldm-1315806820.cos.ap-nanjing.myqcloud.com/img/20260620135948300.png)

setup 4：出现如图所示内容，说明配置完成。
![](https://ob-tc-caldm-1315806820.cos.ap-nanjing.myqcloud.com/img/20260620135948301.png)

### 3. 模板文件导入
1. 将模块内的 4 个 `.md` 模板文件放入你的 Templater 核心模板文件夹中。
2. 按照本页上方 **【🔧 关键配置与路径本地化修改指引】** 进行路径核对，确保无误。

## 🔄 系统无缝流转闭环

1. **自下而上关联**：新建任何任务或资料时，触发模板会自动调用 `para-get-folder-file.js` 唤起弹窗，要求你指定一个 MOC 主控页面，自动在其正文写入 `[ area:: [[MOC名称]] ]` 建立反链。
2. **中枢自动聚合**：打开通过 `tp-PARA-领域索引.md` 生成的 MOC 页面时，DataviewJS 会实时读取所有反链指向它的文件，并比对 `para_config.json` 中的字段配置，自动渲染出“任务”、“领域”、“资料”、“归档”多维表格。
3. **一键完成归档**：在任意任务笔记中按下快捷键触发 QuickAdd 动作，后台将自动把 YAML 属性刷新为 `status: done` 和 `type: Archive`。该笔记在主控 MOC 页面中会**自动从任务表位移到归档表**，全程无需物理移动文件。

## 💬 反馈与支持

如果你在配置或使用本套 PARA 系统模块的过程中遇到了任何问题，包括但不限于：
* 💡 发现 README 中的路径、代码或配置指引有含糊不清、不够明确的地方；
* 🐛 脚本在特定的 Obsidian 版本或环境下运行时触发了报错；
* 🛠️ 对自动化工作流有更好的魔改建议或优化思路。

欢迎直接在本仓库的 **[GitHub Issues](https://github.com/zoeTDI/obsidianJS/issues)** 页面提交 Issue 说明。感谢你的支持与反馈！