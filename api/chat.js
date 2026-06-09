const ZHIPU_API_KEY = "ca36c85232584ebc9bf8bed9819690bb.NxlJmqnX2zpZjkJM";
const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

// 指数退避重试函数
async function fetchWithRetry(url, options, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        const response = await fetch(url, options);
        if (response.status !== 429) return response;
        
        retries++;
        const waitTime = Math.pow(2, retries) * 1000; // 1s → 2s → 4s
        console.log(`收到429限流，等待${waitTime}ms后重试（第${retries}次）`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    throw new Error("多次重试后仍被限流，请稍后再试");
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
            return res.status(400).json({error:"messages必须是非空数组"});
        }

        const upstreamResp = await fetchWithRetry(ZHIPU_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ZHIPU_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: "glm-4.7-flash",
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        const upstreamData = await upstreamResp.json();
        if (!upstreamResp.ok) {
            return res.status(upstreamResp.status).json({
                tip: "智谱官方返回错误",
                officialError: upstreamData
            });
        }
        res.status(200).json(upstreamData);
    } catch (err) {
        console.error("后端完整报错：", err);
        res.status(429).json({error:"请求被限流", detail: err.message});
    }
};
