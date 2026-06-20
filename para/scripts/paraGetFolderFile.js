/**
 * @file para-get-folder-file.js
 * @description 灵活、通用的文件夹文件检索与选择弹窗脚本，支持按 Frontmatter 的 type 标签动态过滤。
 * @author 用户
 */

/**
 * 检索指定文件夹下符合特定 type 标签的文件，并弹出选择器供用户选择
 * @async
 * @param {object} tp - Templater 插件传入的原始 tp 上下文对象 (必填)
 * @param {object} [options={}] - 配置参数对象 (选填)
 * @param {string} [options.targetFolder="15-项目系统"] - 要检索的 Obsidian 库内目标文件夹路径
 * @param {string} [options.typeValue="moc"] - 筛选 Frontmatter 中 'type' 属性对应的值（不区分大小写）
 * @param {string} [options.defaultValue="未分类"] - 用户取消选择或未检索到结果时的保底默认返回值
 * @param {string} [options.suggesterPlaceholder="请选择一个 MOC 项目："] - 弹窗选择框的提示占位文本
 * @returns {Promise<string>} 返回最终选中的文件名称（不含后缀），若未选则返回默认值
 */
async function paraGetFolderFile(tp, {
    targetFolder = "15-项目系统",
    typeValue = "moc",
    defaultValue = "未分类",
    suggesterPlaceholder = "请选择一个 MOC 项目："
} = {}) {
    
    let finalValue = defaultValue;

    // 1. 获取指定文件夹下的所有 Markdown 文件并做安全过滤
    const files = app.vault.getMarkdownFiles().filter(file => {
        return file.path.startsWith(targetFolder + "/");
    });

    // 2. 动态提取并过滤出符合 Frontmatter [type === typeValue] 条件的文件名
    const matchedFileNames = [];
    for (const file of files) {
        const cache = app.metadataCache.getFileCache(file);
        if (cache && cache.frontmatter && cache.frontmatter.type) {
            const currentType = String(cache.frontmatter.type).trim().toLowerCase();
            if (currentType === typeValue.toLowerCase()) {
                matchedFileNames.push(file.basename);
            }
        }
    }

    // 3. 检查匹配结果并唤起 Templater 弹窗选择框
    if (matchedFileNames.length > 0) {
        const selectedValue = await tp.system.suggester(
            matchedFileNames, 
            matchedFileNames, 
            false, 
            suggesterPlaceholder
        );
        
        if (selectedValue) {
            finalValue = selectedValue;
        } else {
            new Notice(`⚠️ 未选择任何项，系统已赋予默认值：${defaultValue}`);
        }
    } else {
        new Notice(`💡 在文件夹 "${targetFolder}" 中未找到 type 为 "${typeValue}" 的笔记，已自动使用默认值：${defaultValue}`);
    }

    return finalValue;
}

module.exports = paraGetFolderFile;