---
<%*
const finalAreaValue = await tp.user.paraGetFolderFile(tp, {
    targetFolder: "15-项目系统",
    typeValue: "moc",
    defaultValue: "未分类",
    suggesterPlaceholder: "请选择一个 MOC 项目："
});
-%>
type: Area
---

[ area:: [[<%* tR += finalAreaValue %>]] ]