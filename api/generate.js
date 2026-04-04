export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userInput } = req.body;
  if (!userInput) return res.status(400).json({ error: 'userInput required' });

  const systemPrompt = `你是一个"可能世界探索者"，是AI辅助创意写作的工具。你的任务是阅读用户输入的文本（故事片段或大纲），然后从以下九个维度各生成一条"如果……"开头的反事实变体。

## 九个维度定义
1. 身份相容性：改变人物的身份或存在状态。例如："如果主角不是现在的身份，而是另一个人？"
2. 实体清单相容性：引入现实中不存在的实体或物品。例如："如果故事中突然出现了一个从未见过的神秘物品？"
3. 时空相容性：改变时间或空间设定。例如："如果这件事发生在十年前，而不是现在？"
4. 自然定律相容性：改变物理或自然规律。例如："如果重力突然消失了，故事会怎样？"
5. 物种相容性：改变物种属性或引入新物种。例如："如果主角是一只猫而不是人？"
6. 逻辑相容性：改变逻辑规则，制造悖论或矛盾。例如："如果同时发生了两个互相矛盾的事件？"
7. 分析相容性：改变定义性真理或基本事实。例如："如果在这个世界里，'蓝色'被所有人认为是'红色'？"
8. 语言相容性：改变语言表达或沟通规则。例如："如果角色只能说反话，他们如何表达爱意？"
9. 认知相容性：改变角色的感知或认知能力。例如："如果主角突然拥有了读心术？"

## 输出要求
- 严格按照以上顺序，为每个维度生成一条变体
- 每条变体以"如果……"开头
- 每条变体控制在15-25个汉字
- 输出格式为纯文本，每个变体占一行，格式："维度名：变体"
- 不要评价，不要建议，只输出九条变体`;

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
        max_tokens: 800  // 九条变体需要更多token
      })
    });

    // 检查 HTTP 状态码
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub Models API 错误 ${response.status}:`, errorText);
      return res.status(response.status).json({ error: `API 错误 ${response.status}: ${errorText}` });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content;
    const lines = raw.split('\n').filter(l => l.trim());
    
    // 维度名称列表（顺序与 prompt 中一致）
    const dimensionNames = [
      '身份相容性', '实体清单相容性', '时空相容性', '自然定律相容性',
      '物种相容性', '逻辑相容性', '分析相容性', '语言相容性', '认知相容性'
    ];
    
    const variations = [];
    for (let i = 0; i < dimensionNames.length; i++) {
      let text = '';
      // 尝试从行中提取 "维度名：变体"
      const line = lines[i] || '';
      const match = line.match(/^[\d]*\.?\s*(.+?)[：:]\s*(.+)/);
      if (match) {
        // 匹配到冒号分隔符
        text = match[2].trim();
      } else {
        // 如果没有冒号，直接取整行内容（去除序号）
        text = line.replace(/^\d+\.\s*/, '');
      }
      if (!text) text = `如果...（${dimensionNames[i]}方向待探索）`;
      variations.push({ type: dimensionNames[i], text });
    }
    
    res.status(200).json({ variations });
  } catch (err) {
    console.error('Handler 异常:', err);
    res.status(500).json({ error: '生成失败: ' + err.message });
  }
}
