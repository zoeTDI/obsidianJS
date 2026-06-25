---
id: <% tp.file.creation_date("YYYYMMDDHHmmss") %>
date: <% tp.file.creation_date("YYYY-MM-DD") %>
project: <% tp.file.folder(true).split('/')[1] || "请选择项目" %>
type: 分卷
---

[ prev :: [[请选择上一分卷]] ]

```dataviewjs
const currentEvent = dv.current();

if (!currentEvent.project) {
    dv.paragraph("⚠️ 未发现 project 属性，请检查当前事件文件的 YAML 区。");
} else {
    try {
        // 1. 定义外部 JS 脚本和 JS 配置文件的物理路径
        const baseDir = app.vault.adapter.getBasePath();
        const scriptPath = baseDir + "/00-System/20-Template/scripts/event-tree-provider.js";
        const configPath = baseDir + "/00-System/20-Template/scripts/event-chapter-tree-config.js";
        
        // ⚡【安全清理】防缓存策略：同时切断核心引擎和配置文件的旧缓存
        if (typeof require !== 'undefined' && require.cache) {
            if (require.cache[scriptPath]) delete require.cache[scriptPath];
            if (require.cache[configPath]) delete require.cache[configPath];
        }
        
        // 2. 载入核心引擎模块与配置模块
        const provider = require(scriptPath);
        const config = require(configPath);
        // 3. 配置驱动：获取洗净排序后的嵌套结构数据
        const treeData = provider.getConfigDrivenTreeData(dv, currentEvent, config);

        // 4. 配置驱动：执行 HTML 零装饰极简渲染
        const rootContainer = document.createElement("div");
        rootContainer.style.marginTop = "12px";
        
        provider.renderConfigDrivenTree(treeData, rootContainer, config);
        
        // 5. 将生成的组件挂载注入当前 Obsidian 页面
        dv.container.appendChild(rootContainer);

    } catch (e) {
        dv.paragraph(`<span style="color:red;">❌ 外部渲染脚本运行失败: ${e.message}</span>`);
    }
}
```

## 本卷核心大纲与核心事件



## 分卷内核心大纲冲突走势图
