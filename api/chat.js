// ========== 替换为你在硅基流动生成的永久API密钥 ==========
const SILICONFLOW_API_KEY = "sk-gxjduonwtygnnieynspicxhjhhazffvkniomcxkvrlbtowca";
// ======================================================

const SILICONFLOW_URL = "https://api.siliconflow.cn/v1/chat/completions";
// 免费模型（必须带完整前缀）
const MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct";

async function fetchWithRetry(url, options, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        const response = await fetch(url, options);
        if (response.status !== 429) return response;
        
        retries++;
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`限流重试：第${retries}次，等待${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    throw new Error("请求被限流，请稍后再试");
}

module.exports = async (req, res) => {
    // 跨域配置
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    
    if (req.method !== "POST") {
        return res.status(405).json({ error: "仅支持POST请求" });
    }

    try {
        // 解析请求体
        const bufferList = [];
        for await (const chunk of req) bufferList.push(chunk);
        const rawBody = Buffer.concat(bufferList).toString();
        const { messages } = JSON.parse(rawBody);

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "消息不能为空" });
        }

        // 调用硅基流动API
        const upstreamResp = await fetchWithRetry(SILICONFLOW_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SILICONFLOW_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        const upstreamData = await upstreamResp.json();
        
        // 透传硅基流动的完整错误信息，方便排查
        if (!upstreamResp.ok) {
            return res.status(upstreamResp.status).json({
                tip: "硅基流动返回错误",
                code: upstreamData.code,
                message: upstreamData.message,
                full_error: upstreamData
            });
        }

        res.status(200).json(upstreamData);

    } catch (err) {
        console.error("后端完整报错：", err);
        res.status(500).json({
            error: "服务器内部错误",
            detail: err.message
        });
    }
};
