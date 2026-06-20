/**
 * @file para-load-config.js
 * @description 供 Templater 全局调用的外部 JSON 配置读取工具脚本，实现元数据字典与 md 模板的彻底解耦。
 * @author 用户
 */

/** @constant {string} CONFIG_JSON_PATH - 库内存储 MOC 配置 JSON 文件的相对路径 */
const CONFIG_JSON_PATH = "template/data/para_config.json";

/**
 * 读取并解析指定的库内 JSON 配置文件
 * @private
 * @async
 * @returns {Promise<object>} 返回解析后的 JSON 对象，若失败则返回空对象
 */
async function readJsonConfig() {
    try {
        const rawData = await app.vault.adapter.read(CONFIG_JSON_PATH);
        return JSON.parse(rawData);
    } catch (error) {
        new Notice(`❌【PARA 配置加载错误】无法读取配置文件，请检查路径：\n${CONFIG_JSON_PATH}\n错误信息：${error.message}`);
        return {};
    }
}

module.exports = {
    /**
     * 获取任务/项目状态的美化字典映射 (statusMap)
     * @async
     * @returns {Promise<Object.<string, string>>}
     */
    getStatusMap: async () => {
        const config = await readJsonConfig();
        return config.statusMap || {};
    },

    /**
     * 获取任务/项目优先级的美化字典映射 (priorityMap)
     * @async
     * @returns {Promise<Object.<string, string>>}
     */
    getPriorityMap: async () => {
        const config = await readJsonConfig();
        return config.priorityMap || {};
    },

    /**
     * 获取资料价值评价的美化字典映射 (qualityMap)
     * @async
     * @returns {Promise<Object.<string, string>>}
     */
    getQualityMap: async () => {
        const config = await readJsonConfig();
        return config.qualityMap || {};
    },

    /**
     * 获取资料核心主题的美化字典映射 (topicMap)
     * @async
     * @returns {Promise<Object.<string, string>>}
     */
    getTopicMap: async () => {
        const config = await readJsonConfig();
        return config.topicMap || {};
    }
};