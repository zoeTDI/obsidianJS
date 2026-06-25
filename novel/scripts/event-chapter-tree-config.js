const treeConfig = {
  treeLevels: [
    {
      levelType: '事件',
      refField: 'volume',
      prefix: "📖",
      canToggle: true,
      linkMode: "tab",
      fields: []
    },
    {
      levelType: "章节",
      refField: "event",
      prefix: "🎬",
      canToggle: false,
      linkMode: "tab",
      fields: [
        {
          fieldName: "summary",
          formatter: (page, val) => {
            if (!val) return "";
            let str = String(val).trim().replace(/[\r\n]+/g, " ");
            if (str.length > 80) str = str.substring(0, 80) + "...";

            const isLongScene = page.words && parseInt(page.words) > 3000;
            const prefix = isLongScene ? "🔥 [长文] 梗概: " : "梗概: ";

            return str.startsWith("梗概:") ? str : `${prefix}${str}`;
          }
        }
      ]
    }
  ],
  defaultExpanded: true
}

module.exports = treeConfig