// Cloudflare Pages Function：代理豆包（火山方舟）Responses API 调用，
// 让 API Key 只留在 Cloudflare 后台的环境变量里，不会出现在浏览器可见的前端代码中。
// 访问路径固定为 /api/ai-chat（由文件路径 functions/api/ai-chat.js 决定，无需额外配置路由）。

const DOUBAO_MODEL = 'doubao-seed-evolving';
const DOUBAO_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const SYSTEM_PROMPT = '你是顽豹AI，一个面向儿童的智能陪伴机器人，说话简短、友好、活泼，适合小朋友理解，控制在 60 字以内。你可以像朋友一样回答小朋友的各种问题（编程、生活常识、天气、故事等都可以），遇到不适合儿童的内容要礼貌拒绝并引导到健康话题。';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const apiKey = context.env.DOUBAO_API_KEY;
  if (!apiKey) {
    return json({ error: { message: '服务端未配置 DOUBAO_API_KEY 环境变量' } }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: { message: '请求体不是合法 JSON' } }, 400);
  }

  const userText = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!userText) {
    return json({ error: { message: 'text 不能为空' } }, 400);
  }
  if (userText.length > 300) {
    return json({ error: { message: 'text 过长' } }, 400);
  }

  try {
    const upstream = await fetch(DOUBAO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        instructions: SYSTEM_PROMPT,
        thinking: { type: 'disabled' },
        input: [
          { role: 'user', content: [{ type: 'input_text', text: userText }] }
        ]
      })
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || ('HTTP ' + upstream.status);
      return json({ error: { message } }, upstream.status);
    }

    return json(data, 200);
  } catch (err) {
    return json({ error: { message: '连接豆包服务失败：' + err.message } }, 502);
  }
}

export async function onRequestGet() {
  return json({ error: { message: 'Method not allowed' } }, 405);
}
