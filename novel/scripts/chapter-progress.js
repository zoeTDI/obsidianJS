// ======= 1. 安全处理 words 属性的辅助函数 =======
function parseWords(wordsValue) {
    if (wordsValue === undefined || wordsValue === null) return 0;
    if (typeof wordsValue === "number") return Number.isNaN(wordsValue) ? 0 : wordsValue;
    if (typeof wordsValue === "string") {
        let parsed = parseInt(wordsValue.trim(), 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

// ======= 2. 🎯 新增：封装元素渲染的独立方法 =======
/**
 * 渲染进度条下方的图文激励区域
 * @param {string} avatarUrl - 头像的 URL（可以为网络图片链接或库内本地路径）
 * @param {string} text - 需要显示的鼓励性多行文本（支持 HTML 如 <br>）
 * @param {string} themeColor - 当前进度条的主题颜色（用于同步头像边框色）
 */
function renderProgressUI(avatarUrl, text, themeColor) {
    // 创建底部图文混合容器
    const contentRow = document.createElement("div");
    contentRow.style.display = "flex";
    contentRow.style.alignItems = "flex-start"; // 顶部对齐，适合多行文本
    contentRow.style.gap = "12px";              // 头像和文字的间距

    // 防御性措施：只有当 avatarUrl 存在且不为空时，才渲染头像组件
    if (avatarUrl && avatarUrl.trim() !== "") {
        const avatarImg = document.createElement("img");
        avatarImg.src = avatarUrl.trim();
        avatarImg.style.margin = 'auto 0';
        avatarImg.style.width = "42px";
        avatarImg.style.height = "42px";
        avatarImg.style.borderRadius = "50%";      // 裁剪成完美的圆形
        avatarImg.style.objectFit = "cover";
        avatarImg.style.flexShrink = "0";           // 防御性：防止头像被右侧长文本挤压变形
        avatarImg.style.border = `2px solid ${themeColor}`; // 同步状态条颜色，极具一体感
        avatarImg.style.backgroundColor = "var(--background-secondary)";
        contentRow.appendChild(avatarImg);
    }

    // 创建鼓励文案框
    const encourageBox = document.createElement("div");
    encourageBox.style.fontSize = "13px";
    encourageBox.style.color = "var(--text-muted)"; // Obsidian 官方自适应浅灰色变量
    encourageBox.style.lineHeight = "1.6";
    encourageBox.style.padding = "2px 0";
    encourageBox.innerHTML = text;

    contentRow.appendChild(encourageBox);
    return contentRow;
}

// ======= 3. 主流程：出链扫描与计算 =======
let currentFile = dv.current();
let outlinksArray = Array.from(currentFile.file.outlinks);
let totalWords = 0;

for (let link of outlinksArray) {
    let page = dv.page(link.path);
    if (page && page.type === "场景") {
        totalWords += parseWords(page.words);
    }
}

// ======= 4. 主流程：读取并解析 JSON 配置文件 =======
const configPath = "00-System/20-Template/data/encourage-config.json";
let progressColor = "#faad14"; 
let encourageText = "正在加载码字状态...";
let finalAvatarUrl = ""; 

const targetWords = 2000;
let progressPercent = parseFloat(((totalWords / targetWords) * 100).toFixed(1));

try {
    const configFile = app.vault.getAbstractFileByPath(configPath);
    if (configFile) {
        const rawJson = await app.vault.read(configFile);
        const configObj = JSON.parse(rawJson);
        
        let globalAvatar = configObj.globalAvatarUrl || "";
        let rules = configObj.rules || [];
        
        // 匹配当前的百分比落在哪个区间
        const matchedRule = rules.find(rule => progressPercent >= rule.minPercent && progressPercent <= rule.maxPercent);
        
        if (matchedRule) {
            progressColor = matchedRule.color;
            
            // 头像判定：局部优先于全局
            finalAvatarUrl = (matchedRule.avatarUrl || globalAvatar).trim();
            
            // 文案随机抽取
            if (Array.isArray(matchedRule.text)) {
                if (matchedRule.text.length > 0) {
                    let randomIndex = Math.floor(Math.random() * matchedRule.text.length);
                    encourageText = matchedRule.text[randomIndex];
                } else {
                    encourageText = "该区间配置的文案数组为空。";
                }
            } else {
                encourageText = matchedRule.text || "";
            }
        }
    } else {
        encourageText = `<span style='color:red;'>未找到配置文件，请检查路径: ${configPath}</span>`;
    }
} catch (e) {
    encourageText = `<span style='color:red;'>配置 JSON 解析失败: ${e.message}</span>`;
}

let displayPercent = progressPercent.toFixed(1);

// ======= 5. 主流程：组装框架并调用渲染方法 =======
const container = document.createElement("div");
container.style.marginBottom = "20px";

// A. 上方状态栏
const statusLine = document.createElement("div");
statusLine.style.fontSize = "14px";
statusLine.style.marginBottom = "8px";
statusLine.style.display = "flex";
statusLine.style.justifyContent = "space-between";
statusLine.style.alignItems = "center";
statusLine.innerHTML = `<span><strong>当前章节字数：</strong><span style="font-size: 16px; font-weight: bold; color: ${progressColor};">${totalWords}</span> / ${targetWords} 字</span>
<span style="font-weight: bold; color: ${progressColor};">${displayPercent}%</span>`;

// B. 进度条轨道
const progressTrack = document.createElement("div");
progressTrack.style.width = "100%";
progressTrack.style.backgroundColor = "var(--background-modifier-border)";
progressTrack.style.borderRadius = "6px";
progressTrack.style.height = "12px";
progressTrack.style.overflow = "hidden";
progressTrack.style.marginBottom = "16px";

// C. 进度条填充
const progressBar = document.createElement("div");
progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
progressBar.style.backgroundColor = progressColor;
progressBar.style.height = "100%";
progressBar.style.transition = "width 0.3s ease";

// D. 调用封装好的独立方法，获取渲染后的图文节点
const messageRow = renderProgressUI(finalAvatarUrl, encourageText, progressColor);

// E. 节点总拼装并注入
progressTrack.appendChild(progressBar);
container.appendChild(statusLine);
container.appendChild(progressTrack);
container.appendChild(messageRow); // 塞入封装方法返回的节点

dv.container.appendChild(container);