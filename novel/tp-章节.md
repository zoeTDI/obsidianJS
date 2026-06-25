---
id: <% tp.file.creation_date("YYYYMMDDHHmmss") %>
date: <% tp.file.creation_date("YYYY-MM-DD") %>
project: <% tp.file.folder(true).split('/')[1] || "请选择项目" %>
type: 章节
---

[ event :: [[请选择所属事件]] ]

[ prev :: [[请选择上一章节]] ]

```dataviewjs
await dv.view("00-System/20-Template/scripts/chapter-progress");
```

## 正文
