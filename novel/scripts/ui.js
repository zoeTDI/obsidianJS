function createEmptyTip(container) {
  const pEl = document.createElement('p');
  pEl.style.color = 'var(--text-muted)';
  pEl.style.fontSize = '13px';
  pEl.innerText = "📌 当前文件下暂无关联的层级树数据。";
  container.appendChild(pEl);
}

function createTreeWrapper() {
  const treeWrapper = document.createElement("div");
  treeWrapper.style.display = "flex";
  treeWrapper.style.flexDirection = "column";
  treeWrapper.style.gap = "8px";
  return treeWrapper;
}

function createSummary() {
  const summaryEl = document.createElement("summary");
  summaryEl.style.cursor = "pointer";
  summaryEl.style.fontSize = "14px";
  summaryEl.style.fontWeight = "500";
  summaryEl.style.padding = "4px 0";
  summaryEl.style.display = "flex";
  summaryEl.style.justifyContent = "space-between";
  summaryEl.style.alignItems = "center";
  summaryEl.style.listStyle = "none";
  summaryEl.style.setProperty("::marker", "none");
  return summaryEl;
}

function createLeftBox() {
  const leftBox = document.createElement("div");
  leftBox.style.display = "flex";
  leftBox.style.alignItems = "center";
  leftBox.style.gap = "6px";
  return leftBox;
}

function createIndicatorSpan(detailsEl) {
  const indicatorSpan = document.createElement("span");
  indicatorSpan.style.color = "var(--text-muted)";
  indicatorSpan.style.fontSize = "10px";
  indicatorSpan.style.width = "12px";
  indicatorSpan.textContent = detailsEl.open ? "▼" : "▶";
  return indicatorSpan;
}

function createNameSpan(data, config, fn) {
  const nameSpan = document.createElement("span");
  nameSpan.style.color = "var(--text-accent)";
  nameSpan.textContent = `${config.prefix || ""} ${data.fileName}`;
  nameSpan.style.cursor = "pointer";
  nameSpan.onmouseenter = () => nameSpan.style.textDecoration = "underline";
  nameSpan.onmouseleave = () => nameSpan.style.textDecoration = "none";
  nameSpan.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    fn(e);
  };
  return nameSpan
}

function createRightSpan(data, config) {

  const rightFieldConfigs = config.rightFields;

  if (!rightFieldConfigs || !Array.isArray(rightFieldConfigs)) return null;

  const containerSpan = document.createElement("span");
  containerSpan.style.display = "flex";
  containerSpan.style.gap = "10px"; // 设置字段间间隔
  containerSpan.style.marginLeft = "auto";
  containerSpan.style.alignItems = "center";

  rightFieldConfigs.forEach((cfg, index) => {
    const { fieldName, formatter } = cfg;
    const val = data[fieldName];

    const itemSpan = document.createElement("span");
    itemSpan.style.color = "var(--text-muted)";
    itemSpan.style.fontSize = "12px";
    itemSpan.style.fontWeight = "normal";

    // 使用 formatter 处理或直接展示
    itemSpan.textContent = formatter ? formatter(data.rawPageInstance, val) : (val || "");

    containerSpan.appendChild(itemSpan);
  });

  return containerSpan;
}

function createContentBox() {
  const contentBox = document.createElement("div");
  contentBox.style.paddingLeft = "18px";
  contentBox.style.marginTop = "4px";
  return contentBox;
}

function createDetails() {
  const detailsEl = document.createElement("details");
  return detailsEl;
}

function createParentInfoEl(text) {
  const parentInfoEl = document.createElement("div");
  parentInfoEl.style.fontSize = "13px";
  parentInfoEl.style.color = "var(--text-muted)";
  parentInfoEl.style.padding = "4px 16px";
  parentInfoEl.style.lineHeight = "1.4";
  parentInfoEl.style.borderLeft = "2px solid var(--text-accent)";
  parentInfoEl.style.marginBottom = "6px";
  parentInfoEl.textContent = text;
  return parentInfoEl;
}

module.exports = {
  createTreeWrapper: createTreeWrapper,
  createEmptyTip: createEmptyTip,
  createSummary: createSummary,
  createLeftBox: createLeftBox,
  createIndicatorSpan: createIndicatorSpan,
  createNameSpan: createNameSpan,
  createRightSpan: createRightSpan,
  createContentBox: createContentBox,
  createDetails: createDetails,
  createParentInfoEl: createParentInfoEl,
}