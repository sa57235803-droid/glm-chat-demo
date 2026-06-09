const ZHIPU_API_KEY = "ca36c85232584ebc9bf8bed9819690bb.NxlJmqnX2zpZjkJM";
const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

module.exports = async (req, res) => {
  // 处理跨域
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({error:"仅支持POST请求"});

  try {
    // 关键修复：手动读取、解析POST的JSON数据
    const bufferList = [];
    for await (const chunk of req) bufferList.push(chunk);
    const rawBody = Buffer.concat(bufferList).toString();
    const { messages } = JSON.parse(rawBody);

    // 前置参数校验
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({error:"messages必须是非空数组"});
    }

    // 调用智谱上游接口
    const upstreamResp = await fetch(ZHIPU_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ZHIPU_API_KEY.trim()}`
      },
      body: JSON.stringify({
        model: "glm-4.7-flash", // 模型名称不能写错
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const upstreamData = await upstreamResp.json();
    // 透传上游错误详情，方便定位问题
    if (!upstreamResp.ok) {
      return res.status(upstreamResp.status).json({
        tip: "智谱官方返回参数错误",
        officialError: upstreamData
      });
    }
    res.status(200).json(upstreamData);
  } catch (err) {
    console.error("后端完整报错：", err);
    res.status(400).json({error:"接口处理失败", detail: err.message});
  }
};
