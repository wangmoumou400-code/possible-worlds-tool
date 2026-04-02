export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userInput } = req.body;
  if (!userInput) return res.status(400).json({ error: 'userInput required' });

  const systemPrompt = `你是一个"可能世界探索者"，是AI辅助创意写作的工具。你的任务是阅读用户输入的文本，然后从五个固定的可能世界类型出发，各生成一条"如果……"开头的反事实变体。

## 五个可能世界类型定义
1. 角色替换：改变行动主体。例如"如果做出这个决定的不是主角，而是另一个人？"
2. 时空置换：改变时间或空间设定。例如"如果这件事发生在十年前，而不是现在？"
3. 因果反转：改变事件的前提或结果。例如"如果主角没有发现那个秘密，故事会如何？"
4. 模态转换：将现实变为梦境、想象或幻觉。例如"如果这一切只是主角的一场梦？"
5. 视角切换：从不同角色或观察者的视角重新描述。例如"如果从那个配角的角度来看这件事？"

## 输出要求
- 严格按照顺序，为每个类型生成一条变体
- 每条变体以"如果……"开头
- 每条变体控制在15-25个汉字
- 输出格式为纯文本，每个变体占一行，以"1.""2."等序号标记
- 不要评价，不要建议，只输出五个变体`;

  try {
   const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ],
    temperature: 0.8,
    max_tokens: 500
  })
});

    const data = await response.json();
    const raw = data.choices[0].message.content;
    const lines = raw.split('\n').filter(l => l.trim());
    const types = ['角色替换', '时空置换', '因果反转', '模态转换', '视角切换'];
    const variations = types.map((type, idx) => {
      let text = lines[idx] || '';
      text = text.replace(/^\d+\.\s*/, '');
      if (!text) text = `如果...（${type}方向待探索）`;
      return { type, text };
    });
    res.status(200).json({ variations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '生成失败' });
  }
}
