// ========== 在这里替换成你自己的 智谱 API Key ==========
const ZHIPU_API_KEY = "ca36c85232584ebc9bf8bed9819690bb.NxlJmqnX2zpZjkJM";
// =====================================================

const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

// Vercel Serverless 函数入口
module.exports = async (req, res) => {
    // 跨域配置，允许 GitHub Pages 访问
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // 处理跨域预检请求
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // 只允许 POST 请求
    if (req.method !== "POST") {
        return res.status(405).json({ error: "仅支持 POST 请求" });
    }

    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: "内容不能为空" });
        }

        // 调用智谱 GLM-4.7-Flash
        const response = await fetch(ZHIPU_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ZHIPU_API_KEY}`
            },
            body: JSON.stringify({
                model: "glm-4.7-flash",
                messages: [{ role: "user", content: content }],
                temperature: 0.7
            })
        });

        const result = await response.json();
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: "服务器内部错误" });
    }
};
