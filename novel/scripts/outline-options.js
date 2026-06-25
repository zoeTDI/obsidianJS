/**
 * 小说大纲事件量化可选值全局配置文件 (适配 Templater / Dataviewjs / SVG渲染)
 */
const OutlineConfig = {
    // 1. 剧情走向趋势 (trend)
    trends: [
        { value: 1,  label: "上升/积蓄", desc: "矛盾升级、主角变强、危机降临、冲突激化" },
        { value: -1, label: "下降/缓解", desc: "日常修整、战后余波、低谷潜伏、悬念蓄势" },
        { value: 0,  label: "平铺直叙", desc: "环境过渡、纯背景交代、信息铺垫" }
    ],

    // 2. 冲突高潮烈度 (intensity)
    intensities: [
        { value: 1, label: "常态铺垫", desc: "常规推进，日常互动或平淡过渡" },
        { value: 2, label: "小高潮",   desc: "局部、单章冲突爆发（如阶段性打脸、局部胜负）" },
        { value: 3, label: "大高潮",   desc: "分卷核心冲突、全书名场面、生死决战（触发高亮）" }
    ],
    
    // 3. SVG 画布默认渲染参数 (供 Dataviewjs 大纲折线图看板复用)
    renderSettings: {
        stepX: 80,          // 节点间横向步长 (像素)
        baseStepY: 20,      // Y 轴起伏基础乘数像素 (Y = trend * intensity * baseStepY)
        canvasHeight: 300,  // 画布基准高度
        initY: 150          // 初始 Y 轴中线位置
    }
};

// 确保兼容性：同时支持 CommonJS 导出 (供外部模块调用)
if (typeof module !== "undefined") {
    module.exports = OutlineConfig;
}