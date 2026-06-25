const {
    createTreeWrapper,
    createEmptyTip,
    createSummary,
    createLeftBox,
    createIndicatorSpan,
    createNameSpan,
    createRightSpan,
    createContentBox,
    createDetails,
    createParentInfoEl
} = require('./ui')

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
                rawPageInstance: childPage
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
            rawPageInstance: parentPage,
            children: childrenData
        };
    });
}


/**
 * 渲染底层的子叶节点 (如：场景层级)
 */
function renderLeafNode(childData, levelConfig) {
    const leafEl = document.createElement("div");
    leafEl.style.padding = "6px 0 6px 16px";
    // leafEl.style.borderLeft = "1px solid var(--background-modifier-border)";
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

    titleRow.appendChild(nameSpan);

    const rightSpan = createRightSpan(childData, levelConfig)
    if (rightSpan) {
        titleRow.appendChild(rightSpan);
    }

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
        createEmptyTip(container);
        return;
    }

    const parentConfig = config.treeLevels[0];
    const childConfig = config.treeLevels[1];
    const defaultExpanded = config.defaultExpanded !== undefined ? config.defaultExpanded : true;

    const treeWrapper = createTreeWrapper();

    treeData.forEach(parentData => {
        const detailsEl = createDetails();
        detailsEl.open = config.defaultExpanded !== undefined ? config.defaultExpanded : true;

        const summaryEl = createSummary()

        const leftBox = createLeftBox();

        const indicatorSpan = createIndicatorSpan(detailsEl);

        const nameSpan = createNameSpan(parentData, parentConfig);

        leftBox.appendChild(indicatorSpan);
        leftBox.appendChild(nameSpan);

        summaryEl.appendChild(leftBox);
        
        const rightSpan = createRightSpan(parentData, parentConfig)
        if (rightSpan) {
            summaryEl.appendChild(rightSpan);
        }

        detailsEl.appendChild(summaryEl);

        detailsEl.addEventListener("toggle", () => {
            indicatorSpan.textContent = detailsEl.open ? "▼" : "▶";
        });

        const contentBox = createContentBox();

        // 遍历父节点的 fields 配置，依次在折叠区域顶部垂直堆叠渲染
        if (parentConfig.fields && Array.isArray(parentConfig.fields)) {
            parentConfig.fields.forEach(f => {
                if (f.formatter && typeof f.formatter === "function") {
                    const rawVal = parentData.fieldsData ? parentData.fieldsData[f.fieldName] : null;

                    // ⭐ 核心注入：第一个参数传入暂存的 rawPageInstance 文件实例
                    const parentFormattedText = f.formatter(parentData.rawPageInstance, rawVal);

                    if (parentFormattedText && parentFormattedText.trim() !== "") {
                        const parentInfoEl = createParentInfoEl(parentFormattedText);
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
        } 
        // 取消空状态显示
        // else {
        //     contentBox.innerHTML += `<div style="color: var(--text-muted); font-size: 12px; padding: 4px 16px;">（暂无归属${childConfig.levelType}）</div>`;
        // }

        detailsEl.appendChild(contentBox);
        treeWrapper.appendChild(detailsEl);
    });

    container.appendChild(treeWrapper);
}

module.exports = {
    getConfigDrivenTreeData: getConfigDrivenTreeData,
    renderConfigDrivenTree: renderConfigDrivenTree
};

