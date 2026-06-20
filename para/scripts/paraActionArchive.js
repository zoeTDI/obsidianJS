/**
 * @file para-action-archive.js
 * @description 供 QuickAdd (Macro 模式) 调用的独立一键归档脚本。通过修改元数据将当前任务一键转化为归档。
 * @author 用户
 */

/**
 * 执行任务归档动作，安全修改当前活动文件的 YAML 属性
 * @async
 * @function paraActionArchive
 * @param {object} params - QuickAdd 框架自动传入的参数上下文对象
 * @returns {Promise<void>} 无返回值
 */
async function paraActionArchive(params) {
    // 获取当前处于编辑或打开状态的活动笔记
    const activeFile = app.workspace.getActiveFile();
    
    if (activeFile) {
        // 利用 Obsidian 官方安全 API 原子化地更新 YAML 属性
        await app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter["status"] = "done";
            frontmatter["type"] = "Archive";
        });
        
        new Notice("✅ 任务已顺利完成，成功转换为归档状态！");
    } else {
        new Notice("❌ 归档失败：未能检测到当前处于活动状态的笔记文件，请确保先打开目标任务页面。");
    }
}

module.exports = paraActionArchive;