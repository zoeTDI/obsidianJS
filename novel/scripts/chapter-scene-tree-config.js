/**
 * 📂 00-System/20-Template/scripts/tree-config.js
 * 核心功能：大纲树级别关系与渲染行为的全局配置（多字段 + 页面实例驱动版）
 */
const treeConfig = {
  treeLevels: [
    {
      levelType: "章节",
      refField: "event",
      prefix: "📖",
      canToggle: true,
      linkMode: "tab",
      rightFields: [
        {
          fieldName: "words",
          formatter: (page, val) => `${val || 0} 字`
        }
      ],
      fields: []
    },
    {
      levelType: "场景",
      refField: "chapter",
      prefix: "🎬",
      canToggle: false,
      linkMode: "tab", 
      rightFields: [
        { fieldName: "words", formatter: (page, val) => `${val || 0} 字` }
      ],
      fields: [
        {
          fieldName: "summary",
          expectType: "string",
          defaultValue: "",
          formatter: (page, val) => {
            if (!val) return "";
            const lengthMax = 80;
            let str = String(val).trim().replace(/[\r\n]+/g, " ");
            if (str.length > lengthMax) str = str.substring(0, lengthMax) + "...";

            const isLongScene = page.words && parseInt(page.words) > 2000;
            const prefix = isLongScene ? "🔥 [长文] 梗概: " : "梗概: ";

            return str.startsWith("梗概:") ? str : `${prefix}${str}`;
          }
        }
      ]
    }
  ],
  defaultExpanded: true
};

module.exports = treeConfig;