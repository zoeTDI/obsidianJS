---
<%*
// 1. 调用灵活的全局脚本获取所属的 MOC Area 项目名称
const finalAreaValue = await tp.user.paraGetFolderFile(tp, {
    targetFolder: "15-项目系统",
    typeValue: "moc",
    defaultValue: "未分类",
    suggesterPlaceholder: "请选择一个 MOC 项目："
});

// 2. 异步从外部获取最新配置字典
const qualityMap = await tp.user.paraLoadConfig.getQualityMap();
const topicMap = await tp.user.paraLoadConfig.getTopicMap();

// 3. 弹出对话框供用户选择（展示带有图标和中文的标签，存入原始的键名值）
const quality = await tp.system.suggester(Object.values(qualityMap), Object.keys(qualityMap)) || "⭐⭐";
const topic = await tp.system.suggester(Object.values(topicMap), Object.keys(topicMap)) || "Life";
-%>
type: Resource
source: 
topic: <%* tR += topic %>
quality: <%* tR += quality %>
---

[ area:: [[<%* tR += finalAreaValue %>]] ]

## 🔗 资源来源
- 

## 💡 核心观点

## 🎯 引用此资料的项目 
```dataview
LIST FROM "15-项目系统" WHERE contains(related_resources, [[<% tp.file.title %>]]) AND type = "Project"
```
