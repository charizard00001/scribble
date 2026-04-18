import OpenAI from 'openai';

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const FALLBACKS = [
  "My AI brain short-circuited trying to understand this masterpiece.",
  "I've seen cave paintings with more artistic merit.",
  "Even abstract art has limits, and you just found them.",
  "If confusion had a face, it would look exactly like this drawing.",
  "I asked my GPU to process this and it filed a complaint.",
];

export async function generateRoast(base64Png, word) {
  if (!groq) return null;

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content:
            'You are a savage but playful art critic in a drawing game. Roast the drawing in 1-2 short sentences. Be funny and witty, not cruel. Keep it under 30 words.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The player was supposed to draw: "${word}". Roast their drawing.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Png.startsWith('data:')
                  ? base64Png
                  : `data:image/png;base64,${base64Png}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 100,
      temperature: 1,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    return text || randomFallback();
  } catch (err) {
    console.error('AI roast error:', err.message);
    return randomFallback();
  }
}

function randomFallback() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}
