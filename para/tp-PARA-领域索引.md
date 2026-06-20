---
type: MOC
---

```dataviewjs
// ==================== 通用工具函数 ====================
function toArray(any) {
    if (!any) return [];
    return Array.isArray(any) ? any : Array.from(any);
}

function linksToPages(arr) {
    return arr.map(link => dv.page(link.path)).filter(p => p != null);
}

/**
 * 过滤 area 属性的工具函数
 * @param {Array} pages - Dataview 页面数组
 * @param {string} curPath - 当前文件的完整路径 (cur.file.path)
 * @param {string} matchType - 筛选策略: 'some' (满足其一) 或 'every' (全部满足)。默认为 'some'
 */
function filterArea(pages, curPath, matchType = 'some') {
    return pages.filter(page => {
        if (!page.area) return false;
        
        // 1. 将 page.area 统一规范化为数组结构（兼容单选与多选）
        const areaArray = Array.isArray(page.area) ? page.area : [page.area];
        
        // 2. 根据配置的策略进行数组过滤
        if (matchType === 'every') {
            // 全部满足：关联的所有 area 的路径都必须等于 curPath
            return areaArray.every(area => area.path === curPath);
        } else {
            // 满足其一（默认）：只要有一个关联的 area 路径等于 curPath 即可
            return areaArray.some(area => area.path === curPath);
        }
    });
}

// ==================== 2. 读取外部 JSON 配置文件 ====================
const jsonPath = "template/data/para_config.json";

try {
    const rawData = await app.vault.adapter.read(jsonPath);
    const configData = JSON.parse(rawData);
    
    // 解构出远程的映射配置字典
    const { statusMap, priorityMap, qualityMap, topicMap, viewConfigs } = configData;

    // ==================== 3. 动态字段解析字典 ====================
    // 建立 [配置列名] 到 [具体数据提取及美化清洗] 的逻辑通道
    const fieldResolver = {
        '文件名': (p) => p.file.link,
        '状态': (p) => statusMap[p.status] || p.status || "-",
        '优先级': (p) => priorityMap[p.priority] || p.priority || "-",
        '价值': (p) => qualityMap[p.quality] || p.quality || "-",
        '主题': (p) => topicMap[p.topic] || p.topic || "-",
        '创建时间': (p) => p.created || "未知",
        '截止日期': (p) => p.deadline || "未知"
    };

    // ==================== 4. 共享业务数据准备 ====================
    const cur = dv.current();
    const curPath = cur.file.path; 
    const allInboundPages = linksToPages(toArray(cur.file.inlinks));

    // ==================== 5. 自动化循环渲染引擎 ====================
    viewConfigs.forEach(config => {
        // 5.1 动态生成标题
        dv.header(2, config.sectionTitle);
        
        // 5.2 过滤对应 type 与 area 的页面
        const typeFiltered = allInboundPages.filter(page => String(page.type).toLowerCase() === config.typeValue.toLowerCase());
        const filteredPages = filterArea(typeFiltered, curPath, config.matchType || 'some');
        
        // 5.3 从 fields 配置动态解析生成表头与行数据
        const headers = config.fields; // 直接使用 JSON 里的字符串数组作为表头
        
        const tableRows = filteredPages.map(page => {
            return config.fields.map(fieldName => {
                const resolver = fieldResolver[fieldName];
                return resolver ? resolver(page) : "-";
            });
        });
        
        // 5.4 渲染表格
        if (tableRows.length > 0) {
            dv.table(headers, tableRows);
        } else {
            dv.paragraph(`*暂无相关的${config.sectionTitle}数据*`);
        }
    });

} catch (error) {
    dv.paragraph(`❌ **配置文件读取或解析失败**: ${error.message} (请检查路径：\`${jsonPath}\`)`);
}
```
