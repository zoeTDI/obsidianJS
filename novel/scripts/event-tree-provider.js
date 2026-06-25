const BASE_TYPE = {
    NUMBER: 'number',
    STRING: 'string',
    BOOLEAN: 'boolean',
    ARRAY: 'array'
}

function caseMetadataValue(rawValue, expectedType) {
    if (rawValue === undefined || rawValue === null) {
        throw new TypeError("Value is null or undefined");
    }
    switch (expectedType) {
        case BASE_TYPE.NUMBER: {
            if (typeof rawValue === 'number') {
                if (Number.isNaN(rawValue)) throw new TypeError("Value is NaN");
                return rawValue;
            }
            let parsedInt = parseInt(String(rawValue).trim(), 10);
            if (Number.isNaN(parsedInt)) throw new TypeError("Cannot parse string to an integer");
            return parsedInt;
        }
        case BASE_TYPE.STRING: {
            let str = String(rawValue).trim();
            if (str === "") throw new TypeError("Value is an empty string");
            return str;
        }
        case BASE_TYPE.BOOLEAN: {
            if (typeof rawValue === 'boolean') return rawValue;
            let lowerStr = String(rawValue).trim().toLowerCase();
            if (lowerStr === 'true' || lowerStr === 'yes' || lowerStr === '1') return true;
            if (lowerStr === 'false' || lowerStr === 'no' || lowerStr === '0') return false;
            throw new TypeError("Cannot parse value to a valid boolean");
        }
        case BASE_TYPE.ARRAY: {
            if (Array.isArray(rawValue)) return rawValue;

            if (rawValue && typeof rawValue === 'object' && typeof rawValue.array === 'function') {
                return Array.from(rawValue);
            }

            if (String(rawValue).trim() !== "") {
                return [rawValue];
            } else {
                throw new TypeError("Cannot convert empty or invalid value to array");
            }
        }
        default: {
            return defaultValue;
        }
    }
}

function parseWords(wordsValue) {
    return caseMetadataValue(wordsValue, BASE_TYPE.NUMBER, 0)
}

function sanitizePath(rawInput) {
    if (!rawInput) return "";
    if (rawInput.path) return decodeURIComponent(rawInput.path);
    let pathStr = String(rawInput).trim();
    const matchMd = pathStr.match(/\((.*?)\.md\)/);
    if (matchMd && matchMd[1]) {
        pathStr = matchMd[1] + ".md";
    } else {
        pathStr = pathStr.replace(/[\[\]]/g, "");
    }
    return decodeURIComponent(pathStr);
}

function sortPagesByChain(pages, startLink) {
    if (!pages || pages.length === 0) return [];
    const pageMap = new Map();
    pages.forEach(p => pageMap.set(sanitizePath(p.file.path), p));
    let sortedList = [];
    let targetStartPath = sanitizePath(startLink);
    let currentLinkPath = "";
    if (targetStartPath) {
        for (let key of pageMap.keys()) {
            if (key === targetStartPath || key.endsWith(targetStartPath)) {
                currentLinkPath = key;
                break;
            }
        }
    }
    if (!currentLinkPath) {
        const firstPage = pages.find(p => !p.prev || p.prev === null || p.prev === "");
        if (firstPage) currentLinkPath = sanitizePath(firstPage.file.path);
    }
    let safetyCounter = 0;
    while (currentLinkPath && safetyCounter < 1000) {
        safetyCounter++;
        let currentPage = pageMap.get(currentLinkPath);
        if (!currentPage) break;
        sortedList.push(currentPage);
        const currentCleanedPath = sanitizePath(currentPage.file.path);
        let nextPage = pages.find(p => !p.prev ? false : sanitizePath(p.prev) === currentCleanedPath);
        currentLinkPath = nextPage ? sanitizePath(nextPage.file.path) : null;
    }
    return sortedList;
}

function openNote(path, mode = "tab") {
    if (!path) return;
    let newLeaf = false;
    if (mode === "tab") newLeaf = "tab";
    else if (mode === "split") newLeaf = true;
    else if (mode === "current") newLeaf = false;
    app.workspace.openLinkText(path, "", newLeaf);
}

// ==========================================
// 🌳 配置驱动：业务数据多字段动态抓取
// ==========================================
function getConfigDrivenTreeData(dv, currentFile, config) {
    console.log(config);
    const project = currentFile.project;
    if (!project || !config || !config.treeLevels || config.treeLevels.length < 2) return null;

    const currentFolder = currentFile.file.folder;
    const currentFilePath = sanitizePath(currentFile.file.path);

    const parentConfig = config.treeLevels[0];
    const childConfig = config.treeLevels[1];

    const parentType = parentConfig.levelType;
    const childType = childConfig.levelType;

    const parentRefField = parentConfig.refField || "event";
    const childRefField = childConfig.refField || "chapter";

    // 1. 动态筛选父节点池
    const allParents = dv.pages(`"${currentFolder}" or #${parentType}`)
        .filter(p => {
            if (p.type !== parentType || p.project !== project) return false;
            if (p.file.path === currentFile.file.path) return false;
            const rawRefValue = p[parentRefField];
            if (!rawRefValue) return false;
            const cleanedRefPath = sanitizePath(rawRefValue);
            return (cleanedRefPath === currentFilePath) || (currentFilePath.endsWith(cleanedRefPath) && cleanedRefPath !== "");
        });
    console.log('allParents: ', allParents)
    // 2. 动态筛选出该项目下的所有子节点池
    const allChildren = dv.pages(`"${currentFolder}" or #${childType}`)
        .filter(p => p.type === childType && p.project === project);

    // 3. 调度链表引擎：排序父节点
    const sortedParents = sortPagesByChain(Array.from(allParents), currentFile.start);

    // 4. 嵌套迭代组装树结构
    return sortedParents.map(parentPage => {
        const parentPagePath = sanitizePath(parentPage.file.path);

        let relatedChildren = allChildren.filter(childPage => {
            const rawChildRefValue = childPage[childRefField];
            if (!rawChildRefValue) return false;
            const cleanedChildRefPath = sanitizePath(rawChildRefValue);
            return (cleanedChildRefPath === parentPagePath) || (parentPagePath.endsWith(cleanedChildRefPath) && cleanedChildRefPath !== "");
        });

        let sortedChildren = sortPagesByChain(Array.from(relatedChildren), null);

        let parentTotalWords = 0;
        let childrenData = sortedChildren.map(childPage => {
            let childWords = 0;
            try {
                childWords = caseMetadataValue(childPage.words, BASE_TYPE.NUMBER)
            } catch (error) {
                console.warn(
                    `[Metadata Warning] 属性解析异常!\n` +
                    `  文件路径: ${childPage.file.path}\n` +
                    `  属性名称: "words"\n` +
                    `  原始数据: [${typeof childPage.words}] ${JSON.stringify(childPage.words)}\n` +
                    `  期望类型: "number"\n` +
                    `  异常原因: ${error.message}\n` +
                    `  解决方案: 已回退至默认值 0`
                )
                childWords = 0;
            }
            parentTotalWords += childWords;

            // 遍历配置中的 fields 数组，动态抓取一组子节点元数据原始值
            let fieldsData = {};
            if (childConfig.fields && Array.isArray(childConfig.fields)) {
                childConfig.fields.forEach(f => {
                    const rawVal = childPage[f.fieldName];
                    const fallbackValue = f.defaultValue !== undefined ? f.defaultValue : null;
                    if (f.expectedType) {
                        try {
                            fieldsData[f.fileName] = caseMetadataValue(rawVal, f.expectedType)
                        } catch (error) {
                            console.warn(
                                `[Metadata Warning] 字段解析异常!\n` +
                                `  文件路径: ${childPage.file.path}\n` +
                                `  属性名称: "${f.fieldName}"\n` +
                                `  原始数据: [${typeof rawVal}] ${JSON.stringify(rawVal)}\n` +
                                `  期望类型: "${f.expectedType}"\n` +
                                `  异常原因: ${error.message}\n` +
                                `  解决方案: 已回退至默认值 ${JSON.stringify(fallbackValue)}`
                            );
                            fieldsData[f.fieldName] = fallbackValue;
                        }
                    } else {
                        fieldsData[f.fieldName] = rawVal || fallbackValue;
                    }
                });
            }

            return {
                fileName: childPage.file.name,
                filePath: childPage.file.path,
                words: childWords,
                fieldsData: fieldsData,
                rawPageInstance: childPage // 暂存完整的 Dataview Page 实例作为上下文
            };
        });

        // 同样遍历配置中的 fields 数组，抓取父层级的一组元数据原始值
        let parentFieldsData = {};
        if (parentConfig.fields && Array.isArray(parentConfig.fields)) {
            parentConfig.fields.forEach(f => {
                const rawVal = parentPage[f.fieldName];
                const fallbackValue = f.defaultValue !== undefined ? f.defaultValue : null;

                if (f.expectedType) {
                    try {
                        parentFieldsData[f.fieldName] = caseMetadataValue(rawVal, f.expectedType);
                    } catch (error) {
                        console.warn(
                            `[Metadata Warning] 字段解析异常!\n` +
                            `  文件路径: ${parentPage.file.path}\n` +
                            `  属性名称: "${f.fieldName}"\n` +
                            `  原始数据: [${typeof rawVal}] ${JSON.stringify(rawVal)}\n` +
                            `  期望类型: "${f.expectedType}"\n` +
                            `  异常原因: ${error.message}\n` +
                            `  解决方案: 已回退至默认值 ${JSON.stringify(fallbackValue)}`
                        );
                        parentFieldsData[f.fieldName] = fallbackValue;
                    }
                } else {
                    parentFieldsData[f.fieldName] = parentPage[f.fieldName] || null;
                }
            });
        }

        return {
            fileName: parentPage.file.name,
            filePath: parentPage.file.path,
            words: parentTotalWords,
            fieldsData: parentFieldsData,
            rawPageInstance: parentPage, // 保存父节点的 Page 实例上下文
            children: childrenData
        };
    });
}

/**
 * 创建大纲树看板的最外层包裹容器
 * @returns {HTMLElement} 初始化的根节点 DOM
 */
function createTreeRootComponent() {
    const treeWrapper = document.createElement("div");
    treeWrapper.className = "dv-tree-wrapper";
    // 注入全局上下文样式隔离，完美适配 Obsidian 暗黑/明亮主题
    treeWrapper.style.fontFamily = "var(--font-interface)";
    treeWrapper.style.color = "var(--text-normal)";
    return treeWrapper;
}

/**
 * 创建父级状态折叠盒组件 (<details>)
 * @param {boolean} defaultExpanded - 是否默认展开
 * @returns {HTMLDetailsElement} Details DOM 实例
 */
function createParentFolderComponent(defaultExpanded) {
    const detailsEl = document.createElement("details");
    detailsEl.className = "dv-tree-parent";
    if (defaultExpanded) {
        detailsEl.setAttribute("open", "true");
    }

    // 注入父级组件内聚的卡片样式
    detailsEl.style.marginBottom = "12px";
    detailsEl.style.border = "1px solid var(--background-modifier-border)";
    detailsEl.style.borderRadius = "6px";
    detailsEl.style.background = "var(--background-primary)";
    detailsEl.style.overflow = "hidden";

    return detailsEl;
}

/**
 * 渲染父级折叠盒的点击触发与元数据聚合状态栏组件 (<summary>)
 * @param {Object} parentPage - 父文件的 Dataview 原始 page 实例
 * @param {Object} levelConfig - 当前层级的配置参数 (如 prefix 等)
 * @param {number} totalWords - 动态向上传递并聚合汇总后的总字数
 * @returns {HTMLElement} Summary DOM 实例
 */
function renderHeaderBarComponent(parentPage, levelConfig, totalWords) {
    const summaryEl = document.createElement("summary");
    summaryEl.className = "dv-tree-parent-summary";

    // 注入 Flex 布局，实现左侧路由、右侧字数两端对齐，并提供点击热区样式
    summaryEl.style.padding = "10px 14px";
    summaryEl.style.background = "var(--background-secondary)";
    summaryEl.style.fontWeight = "bold";
    summaryEl.style.cursor = "pointer";
    summaryEl.style.display = "flex";
    summaryEl.style.alignItems = "center";
    summaryEl.style.justifyContent = "space-between";
    summaryEl.style.borderBottom = "1px solid var(--background-modifier-border)";

    // 1. 左侧槽：图标前缀 + Obsidian 原生双链导航
    const leftSlot = document.createElement("span");
    leftSlot.style.display = "flex";
    leftSlot.style.alignItems = "center";
    leftSlot.style.gap = "6px";

    if (levelConfig.prefix) {
        const prefixEl = document.createElement("span");
        prefixEl.textContent = levelConfig.prefix;
        leftSlot.appendChild(prefixEl);
    }

    // 利用 Dataview 自带的 file.link 渲染函数生成完美的可跳转 internal-link 节点
    const linkEl = parentPage.file.link;
    leftSlot.appendChild(parentPage.file.link.toHTMLElement());
    summaryEl.appendChild(leftSlot);

    // 2. 右侧槽：多文件数据聚合展示区（当前卷/事件总字数，Number 类型即便为 0 也会顽强渲染）
    const rightSlot = document.createElement("span");
    rightSlot.style.fontSize = "12px";
    rightSlot.style.color = "var(--text-muted)";
    rightSlot.style.fontWeight = "normal";
    rightSlot.style.background = "var(--background-modifier-border)";
    rightSlot.style.padding = "2px 6px";
    rightSlot.style.borderRadius = "4px";
    rightSlot.textContent = `${totalWords || 0} 字`;

    summaryEl.appendChild(rightSlot);
    return summaryEl;
}

/**
 * 渲染用于盛放父级描述性元数据与下级叶子流的沙盒容器组件
 * @param {Object} parentPage - 父文件的 Dataview 原始 page 实例
 * @param {Object} levelConfig - 当前父层级的配置信息
 * @returns {HTMLElement} 内容沙盒 DOM 实例
 */
function createContentSlotComponent(parentPage, levelConfig) {
    const contentBox = document.createElement("div");
    contentBox.className = "dv-parent-content-box";
    contentBox.style.padding = "10px 14px";
    contentBox.style.display = "flex";
    contentBox.style.flexDirection = "column";
    contentBox.style.gap = "8px";

    // 💡 核心子抽象：父级元数据字段插槽 (Parent Fields Slot)
    // 贯彻克制渲染原则：动态遍历配置字段，一旦通过校验，渲染带有强调色左边框的简介文本
    if (levelConfig.fields && Array.isArray(levelConfig.fields)) {
        levelConfig.fields.forEach(f => {
            const rawVal = parentPage[f.fieldName];

            // 下方在主干中调用格式化，此处预留装配。
            // 只有当经过格式化器的最终文本存在且不为空时，才会 createElement，严防无意义留白
            if (f.formatter) {
                try {
                    const formattedText = f.formatter(parentPage, rawVal);
                    if (formattedText && String(formattedText).trim() !== "") {
                        const parentInfoField = document.createElement("div");
                        parentInfoField.className = "dv-parent-field-item";
                        parentInfoField.style.fontSize = "13px";
                        parentInfoField.style.color = "var(--text-muted)";
                        parentInfoField.style.padding = "4px 16px";
                        parentInfoField.style.lineHeight = "1.4";
                        parentInfoField.style.borderLeft = "2px solid var(--text-accent)"; // 引用主色调强调左边框
                        parentInfoField.style.marginBottom = "6px";
                        parentInfoField.textContent = formattedText;
                        contentBox.appendChild(parentInfoField);
                    }
                } catch (e) {
                    console.warn(`[Render Warning] 父级属性 "${f.fieldName}" 渲染异常或被策略拦截`, e);
                }
            }
        });
    }

    return contentBox;
}

/**
 * 渲染父级折叠盒的点击触发与元数据聚合状态栏组件 (<summary>)
 * @param {Object} parentPage - 父文件的 Dataview 原始 page 实例
 * @param {Object} levelConfig - 当前层级的配置参数 (如 prefix 等)
 * @param {number} totalWords - 动态向上传递并聚合汇总后的总字数
 * @returns {HTMLElement} Summary DOM 实例
 */
function renderHeaderBarComponent(parentPage, levelConfig, totalWords) {
    const summaryEl = document.createElement("summary");
    summaryEl.className = "dv-tree-parent-summary";

    // 注入 Flex 布局，实现左侧路由、右侧字数两端对齐，并提供点击热区样式
    summaryEl.style.padding = "10px 14px";
    summaryEl.style.background = "var(--background-secondary)";
    summaryEl.style.fontWeight = "bold";
    summaryEl.style.cursor = "pointer";
    summaryEl.style.display = "flex";
    summaryEl.style.alignItems = "center";
    summaryEl.style.justifyContent = "space-between";
    summaryEl.style.borderBottom = "1px solid var(--background-modifier-border)";

    // 1. 左侧槽：图标前缀 + Obsidian 原生双链导航
    const leftSlot = document.createElement("span");
    leftSlot.style.display = "flex";
    leftSlot.style.alignItems = "center";
    leftSlot.style.gap = "6px";

    if (levelConfig.prefix) {
        const prefixEl = document.createElement("span");
        prefixEl.textContent = levelConfig.prefix;
        leftSlot.appendChild(prefixEl);
    }

    // 利用 Dataview 自带的 file.link 渲染函数生成完美的可跳转 internal-link 节点
    const linkEl = parentPage.file.link;
    leftSlot.appendChild(parentPage.file.link.toHTMLElement());
    summaryEl.appendChild(leftSlot);

    // 2. 右侧槽：多文件数据聚合展示区（当前卷/事件总字数，Number 类型即便为 0 也会顽强渲染）
    const rightSlot = document.createElement("span");
    rightSlot.style.fontSize = "12px";
    rightSlot.style.color = "var(--text-muted)";
    rightSlot.style.fontWeight = "normal";
    rightSlot.style.background = "var(--background-modifier-border)";
    rightSlot.style.padding = "2px 6px";
    rightSlot.style.borderRadius = "4px";
    rightSlot.textContent = `${totalWords || 0} 字`;

    summaryEl.appendChild(rightSlot);
    return summaryEl;
}

/**
 * 🎨 微型原子组件：单条叶子节点渲染 (Leaf Node / 子级实体组件)
 * 对应大纲树中的具体【章节】卡片
 * @param {Object} childPage - 子文件的 Dataview 原始 page 实例
 * @param {Object} childConfig - 子层级的配置信息
 * @returns {HTMLElement} 子节点卡片 DOM
 */
function renderLeafNodeComponent(childPage, childConfig) {
    const leafEl = document.createElement("div");
    leafEl.className = "dv-tree-leaf";

    // 微型组件背景样式
    leafEl.style.padding = "8px 12px";
    leafEl.style.background = "var(--background-primary-alt)";
    leafEl.style.borderRadius = "4px";
    leafEl.style.border = "1px solid var(--background-modifier-border)";
    leafEl.style.display = "flex";
    leafEl.style.flexDirection = "column";

    // 1. 标题行容器
    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.justifyContent = "space-between";

    // 1.1 左侧：图标 + 跳转链
    const leftSpan = document.createElement("span");
    leftSpan.style.display = "flex";
    leftSpan.style.alignItems = "center";
    leftSpan.style.gap = "6px";
    leftSpan.style.fontSize = "14px";

    if (childConfig.prefix) {
        const prefixEl = document.createElement("span");
        prefixEl.textContent = childConfig.prefix;
        leftSpan.appendChild(prefixEl);
    }
    leftSpan.appendChild(childPage.file.link.toHTMLElement());
    titleRow.appendChild(leftSpan);

    // 1.2 右侧：单章字数字号（数字格式化安全兜底：如果没写强制给 0 字，并允许渲染）
    const rightSpan = document.createElement("span");
    rightSpan.style.fontSize = "11px";
    rightSpan.style.color = "var(--text-muted)";
    rightSpan.style.fontVariantNumeric = "tabular-nums"; // 确保数字等宽对齐

    let leafWords = 0;
    try {
        leafWords = caseMetadataValue(childPage.words, 'number');
    } catch (e) {
        leafWords = 0; // 即使由于模板生成产生空壳或格式错误，Number 类型也强制转为 0 正常渲染
    }
    rightSpan.textContent = `${leafWords} 字`;
    titleRow.appendChild(rightSpan);
    leafEl.appendChild(titleRow);

    // 2. 克制渲染插槽区：动态字段渲染区
    // 严格遵循铁律：因模板产生的 string、array 属性若为空白（caseMetadataValue 抛出 TypeError）
    // 此处捕获错误后将直接跳过，根本不会在 leafEl 中 append 任何节点，杜绝页面产生无意义缝隙！
    if (childConfig.fields && Array.isArray(childConfig.fields)) {
        childConfig.fields.forEach(f => {
            const rawVal = childPage[f.fieldName];
            if (f.formatter) {
                try {
                    // 校验非数字字段的模板空壳（会触发 caseMetadataValue 内部的报错拦截）
                    // 如果是普通字符串且为空，caseMetadataValue 也会判定无效
                    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
                        const formattedText = f.formatter(childPage, rawVal);
                        if (formattedText && String(formattedText).trim() !== "") {
                            const fieldEl = document.createElement("div");
                            fieldEl.className = "dv-leaf-field-item";
                            fieldEl.style.fontSize = "12px";
                            fieldEl.style.color = "var(--text-muted)";
                            fieldEl.style.marginTop = "3px";
                            fieldEl.style.paddingLeft = "20px";
                            fieldEl.style.lineHeight = "1.4";
                            fieldEl.textContent = formattedText;
                            leafEl.appendChild(fieldEl);
                        }
                    }
                } catch (typeError) {
                    // 捕捉到强类型转换失败（比如非数空值），视为未真实填写的模板空壳，克制过滤，不做渲染
                }
            }
        });
    }

    return leafEl;
}

/**
 * 🎨 空状态原子组件：当某一卷/事件下尚未创建任何关联文件时展示
 * @param {string} levelType - 子层级的名称 (例如：章节)
 * @returns {HTMLElement} 空状态占位 DOM
 */
function renderEmptyStateComponent(levelType) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "dv-tree-empty-placeholder";
    emptyEl.style.color = "var(--text-muted)";
    emptyEl.style.fontSize = "12px";
    emptyEl.style.padding = "4px 16px";
    emptyEl.textContent = `（暂无归属${levelType}）`;
    return emptyEl;
}

/**
 * 渲染底层的子叶节点 (如：场景层级)
 */
function renderLeafNode(childData, levelConfig) {
    const leafEl = document.createElement("div");
    leafEl.style.padding = "6px 0 6px 16px";
    leafEl.style.borderLeft = "1px solid var(--background-modifier-border)";
    leafEl.style.marginBottom = "4px";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.fontSize = "13px";

    const nameSpan = document.createElement("span");
    nameSpan.style.color = "var(--text-normal)";
    nameSpan.style.cursor = "pointer";
    nameSpan.textContent = `${levelConfig.prefix || ""} ${childData.fileName}`;
    nameSpan.onmouseenter = () => nameSpan.style.color = "var(--text-accent)";
    nameSpan.onmouseleave = () => nameSpan.style.color = "var(--text-normal)";
    nameSpan.onclick = () => openNote(childData.filePath, levelConfig.linkMode || "tab");

    const wordsSpan = document.createElement("span");
    wordsSpan.style.color = "var(--text-muted)";
    wordsSpan.style.fontSize = "12px";
    wordsSpan.textContent = `${childData.words} 字`;

    titleRow.appendChild(nameSpan);
    titleRow.appendChild(wordsSpan);
    leafEl.appendChild(titleRow);

    // 遍历 fields 配置，依次格式化并堆叠渲染有效字段
    if (levelConfig.fields && Array.isArray(levelConfig.fields)) {
        levelConfig.fields.forEach(f => {
            if (f.formatter && typeof f.formatter === "function") {
                const rawVal = childData.fieldsData ? childData.fieldsData[f.fieldName] : null;

                // ⭐ 核心注入：第一个参数传入暂存的 rawPageInstance 文件实例，第二个参数传入原始值
                const formattedText = f.formatter(childData.rawPageInstance, rawVal);

                if (formattedText && formattedText.trim() !== "") {
                    const infoEl = document.createElement("div");
                    infoEl.style.fontSize = "12px";
                    infoEl.style.color = "var(--text-muted)";
                    infoEl.style.marginTop = "3px";
                    infoEl.style.paddingLeft = "20px";
                    infoEl.style.lineHeight = "1.4";
                    infoEl.textContent = formattedText;
                    leafEl.appendChild(infoEl);
                }
            }
        });
    }

    return leafEl;
}

/**
 * 配置驱动生成完整的动态大纲树
 */
function renderConfigDrivenTree(treeData, container, config) {
    if (!treeData || treeData.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">📌 当前文件下暂无关联的层级树数据。</p>`;
        return;
    }

    const parentConfig = config.treeLevels[0];
    const childConfig = config.treeLevels[1];
    const defaultExpanded = config.defaultExpanded !== undefined ? config.defaultExpanded : true;

    const treeWrapper = document.createElement("div");
    treeWrapper.style.display = "flex";
    treeWrapper.style.flexDirection = "column";
    treeWrapper.style.gap = "8px";

    treeData.forEach(parentData => {
        const detailsEl = document.createElement("details");
        detailsEl.open = config.defaultExpanded !== undefined ? config.defaultExpanded : true;

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

        const leftBox = document.createElement("div");
        leftBox.style.display = "flex";
        leftBox.style.alignItems = "center";
        leftBox.style.gap = "6px";

        const indicatorSpan = document.createElement("span");
        indicatorSpan.style.color = "var(--text-muted)";
        indicatorSpan.style.fontSize = "10px";
        indicatorSpan.style.width = "12px";
        indicatorSpan.textContent = detailsEl.open ? "▼" : "▶";

        const nameSpan = document.createElement("span");
        nameSpan.style.color = "var(--text-accent)";
        nameSpan.textContent = `${parentConfig.prefix || ""} ${parentData.fileName}`;
        nameSpan.style.cursor = "pointer";
        nameSpan.onmouseenter = () => nameSpan.style.textDecoration = "underline";
        nameSpan.onmouseleave = () => nameSpan.style.textDecoration = "none";
        nameSpan.onclick = (e) => {
            e.stopPropagation();
            openNote(parentData.filePath, parentConfig.linkMode || "tab");
        };

        leftBox.appendChild(indicatorSpan);
        leftBox.appendChild(nameSpan);

        const wordsSpan = document.createElement("span");
        wordsSpan.style.color = "var(--text-muted)";
        wordsSpan.style.fontSize = "12px";
        wordsSpan.style.fontWeight = "normal";
        wordsSpan.textContent = `共 ${parentData.words} 字`;

        summaryEl.appendChild(leftBox);
        summaryEl.appendChild(wordsSpan);
        detailsEl.appendChild(summaryEl);

        detailsEl.addEventListener("toggle", () => {
            indicatorSpan.textContent = detailsEl.open ? "▼" : "▶";
        });

        const contentBox = document.createElement("div");
        contentBox.style.paddingLeft = "18px";
        contentBox.style.marginTop = "4px";

        // 遍历父节点的 fields 配置，依次在折叠区域顶部垂直堆叠渲染
        if (parentConfig.fields && Array.isArray(parentConfig.fields)) {
            parentConfig.fields.forEach(f => {
                if (f.formatter && typeof f.formatter === "function") {
                    const rawVal = parentData.fieldsData ? parentData.fieldsData[f.fieldName] : null;

                    // ⭐ 核心注入：第一个参数传入暂存的 rawPageInstance 文件实例
                    const parentFormattedText = f.formatter(parentData.rawPageInstance, rawVal);

                    if (parentFormattedText && parentFormattedText.trim() !== "") {
                        const parentInfoEl = document.createElement("div");
                        parentInfoEl.style.fontSize = "13px";
                        parentInfoEl.style.color = "var(--text-muted)";
                        parentInfoEl.style.padding = "4px 16px";
                        parentInfoEl.style.lineHeight = "1.4";
                        parentInfoEl.style.borderLeft = "2px solid var(--text-accent)";
                        parentInfoEl.style.marginBottom = "6px";
                        parentInfoEl.textContent = parentFormattedText;
                        contentBox.appendChild(parentInfoEl);
                    }
                }
            });
        }

        // 3. 子列表挂载
        if (parentData.children && parentData.children.length > 0) {
            parentData.children.forEach(childData => {
                contentBox.appendChild(renderLeafNode(childData, childConfig));
            });
        } else {
            contentBox.innerHTML += `<div style="color: var(--text-muted); font-size: 12px; padding: 4px 16px;">（暂无归属${childConfig.levelType}）</div>`;
        }

        detailsEl.appendChild(contentBox);
        treeWrapper.appendChild(detailsEl);
    });

    container.appendChild(treeWrapper);
}

module.exports = {
    getConfigDrivenTreeData: getConfigDrivenTreeData,
    renderConfigDrivenTree: renderConfigDrivenTree
};

