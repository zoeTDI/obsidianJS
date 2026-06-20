---
<%*
// 1. 调用通用的文件检索脚本获取所属的 MOC Area 项目名称
const finalAreaValue = await tp.user.paraGetFolderFile(tp, {
    targetFolder: "15-项目系统",
    typeValue: "moc",
    defaultValue: "未分类",
    suggesterPlaceholder: "请选择一个 MOC 项目："
});

// 2. 异步从外部 JSON 文件加载状态与优先级配置字典
const statusMap = await tp.user.paraLoadConfig.getStatusMap();
const priorityMap = await tp.user.paraLoadConfig.getPriorityMap();

// 3. 弹出对话框供用户选择（展示带图标的美化文本，存入原始的键名值）
const status = await tp.system.suggester(Object.values(statusMap), Object.keys(statusMap)) || "todo";
const priority = await tp.system.suggester(Object.values(priorityMap), Object.keys(priorityMap)) || "P1";
-%>
type: Project
status: <%* tR += status %>
priority: <%* tR += priority %>
deadline: 
outcome: 
---

[ area :: [[<%* tR += finalAreaValue %>]] ]

## 🎯 预期目标
- [ ] 

## 📝 任务笔记

[ related_resources :: ]