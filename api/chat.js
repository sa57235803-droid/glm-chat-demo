// 替换为你的硅基流动API密钥
const SILICONFLOW_API_KEY = "sk-gxjduonwtygnnieynspicxhjhhazffvkniomcxkvrlbtowca";
const SILICONFLOW_URL = "https://api.siliconflow.cn/v1/chat/completions";

async function fetchWithRetry(url, options, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        const response = await fetch(url, options);
        if (response.status !== 429) return response;
        
        retries++;
        const waitTime = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    throw new Error("请求被限流");
}

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({error:"仅支持POST请求"});

    try {
        const bufferList = [];
        for await (const chunk of req) bufferList.push(chunk);
        const rawBody = Buffer.concat(bufferList).toString();
        const { messages } = JSON.parse(rawBody);

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({error:"messages不能为空"});
        }

        const upstreamResp = await fetchWithRetry(SILICONFLOW_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SILICONFLOW_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: "Qwen2.5-7B-Instruct", // 免费模型
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        const upstreamData = await upstreamResp.json();
        if (!upstreamResp.ok) {
            return res.status(upstreamResp.status).json({
                tip: "上游接口错误",
                officialError: upstreamData
            });
        }
        res.status(200).json(upstreamData);
    } catch (err) {
        console.error("后端错误：", err);
        res.status(429).json({error:"请求被限流", detail: err.message});
    }
};
