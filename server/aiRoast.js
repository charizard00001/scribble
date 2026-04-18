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

// ---- Roast Personas ----

const ROAST_STYLES = [
  `Roast the drawing by comparing it to something from the drawer's love life. Be savage and short. One sentence, max 20 words. Focus on what the drawing actually looks like. Example tone: "Even my blind date had better curves than whatever that is."`,
  `Roast the drawing using IT/coding/tech humor. One sentence, max 20 words. Describe what you actually see in the image and mock it. Example tone: "404: artistic talent not found."`,
  `Roast the drawing like a disappointed college professor. One sentence, max 20 words. Reference what the drawing looks like. Example tone: "I've seen better work from students who held the pen with their feet."`,
  `Roast the drawing like an Indian mom guilt-tripping her child. One sentence, max 20 words. React to what's actually drawn. Example tone: "Sharma ji ka beta would never draw something this cursed."`,
  `Roast the drawing like a dramatic sports commentator. One sentence, max 20 words. Narrate what you see as if it's a live disaster. Example tone: "AND THE ARTIST HAS COMPLETELY LOST THE PLOT!"`,
  `Roast the drawing like a sarcastic therapist. One sentence, max 20 words. Analyze what's drawn with fake concern. Example tone: "Tell me about the trauma that led to those proportions."`,
  `Roast the drawing using unhinged Gen-Z internet slang. One sentence, max 20 words. React to what's actually in the image. Example tone: "bestie thought they ate but the canvas is starving fr 💀"`,
  `Roast the drawing like a furious Gordon Ramsay. One sentence, max 20 words. Yell about what you see. Example tone: "IT'S BLOODY RAW! I've seen better lines on a parking lot!"`,
  `Roast the drawing by comparing it to something from office/corporate life. One sentence, max 20 words. Mock what's drawn. Example tone: "Looks like someone made this during a meeting they weren't paying attention to."`,
  `Roast the drawing like a savage stand-up comedian. One sentence, max 20 words. Make a joke about what the drawing actually looks like. Example tone: "If I squint hard enough, I can almost see effort."`,
];

export async function generateRoast(base64Png, word) {
  if (!groq) return null;

  const style = ROAST_STYLES[Math.floor(Math.random() * ROAST_STYLES.length)];

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `You roast drawings in a Pictionary-style game. LOOK AT THE IMAGE and describe/mock what you actually see. ${style} Never start with "This" or "The drawing". Just the roast, nothing else.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `They tried to draw: "${word}". Look at the image and roast it.`,
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
      max_completion_tokens: 60,
      temperature: 1.3,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    return { text: text || randomFallback() };
  } catch (err) {
    console.error('AI roast error:', err.message);
    return { text: randomFallback() };
  }
}

// ---- AI Word Generator ----

const WORD_THEMES = [
  { name: 'Horror Movies', emoji: '🎃', prompt: 'things you see in horror movies (monsters, objects, scenes)' },
  { name: 'College Life', emoji: '🎓', prompt: 'things related to college life (dorm items, campus things, student struggles)' },
  { name: 'Kitchen Chaos', emoji: '🍳', prompt: 'things found in a kitchen or related to cooking' },
  { name: 'Space Adventure', emoji: '🚀', prompt: 'things related to space, planets, astronauts, and sci-fi' },
  { name: 'Office Life', emoji: '💼', prompt: 'things found in an office or related to corporate work culture' },
  { name: 'Bollywood', emoji: '🎬', prompt: 'things related to Indian Bollywood movies, actors doing dramatic things, and filmy scenes' },
  { name: 'Video Games', emoji: '🎮', prompt: 'things related to video games, gaming culture, and famous game characters/items' },
  { name: 'Beach Vacation', emoji: '🏖️', prompt: 'things you see at a beach or on a tropical vacation' },
  { name: 'Gym Bro', emoji: '💪', prompt: 'things related to gym, fitness, workouts, and gym culture' },
  { name: 'Fairy Tales', emoji: '🧚', prompt: 'things from fairy tales, fantasy stories, and magical worlds' },
  { name: 'Street Food', emoji: '🌮', prompt: 'street food items, food carts, and roadside snack culture from around the world' },
  { name: 'School Days', emoji: '📝', prompt: 'things related to school life, classrooms, teachers, and playground' },
  { name: 'Zombie Apocalypse', emoji: '🧟', prompt: 'things you would see or need during a zombie apocalypse' },
  { name: 'Wedding Drama', emoji: '💍', prompt: 'things related to weddings, ceremonies, and wedding drama' },
  { name: 'Social Media', emoji: '📱', prompt: 'things related to social media, influencers, memes, and internet culture' },
  { name: 'Superhero Universe', emoji: '🦸', prompt: 'things related to superheroes, villains, superpowers, and comic books' },
  { name: 'Road Trip', emoji: '🚗', prompt: 'things you see or do on a road trip' },
  { name: 'Pet Life', emoji: '🐶', prompt: 'things related to pet ownership, pet behavior, and animals being funny' },
  { name: 'Festival Vibes', emoji: '🎉', prompt: 'things seen at festivals, carnivals, and celebrations around the world' },
  { name: 'IT Department', emoji: '🖥️', prompt: 'things related to IT jobs, coding, debugging, servers crashing, and tech culture' },
];

export async function generateAIWords() {
  if (!groq) return null;

  const theme = WORD_THEMES[Math.floor(Math.random() * WORD_THEMES.length)];

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: 'You generate word lists for a drawing game like Pictionary. Words must be drawable (physical objects, characters, scenes, actions). Return ONLY a JSON array of 25 unique words, nothing else. Each word should be 1-3 words long. No duplicates. No abstract concepts.',
        },
        {
          role: 'user',
          content: `Generate 25 drawable words related to: ${theme.prompt}. Return only a JSON array like ["word1", "word2", ...]. No explanation.`,
        },
      ],
      max_completion_tokens: 500,
      temperature: 1,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Extract JSON array from response
    const match = raw.match(/\[([\s\S]*?)\]/);
    if (!match) return null;

    const parsed = JSON.parse(`[${match[1]}]`);
    const words = parsed
      .filter((w) => typeof w === 'string' && w.length > 0 && w.length <= 30)
      .map((w) => w.toLowerCase().trim())
      .filter((w, i, arr) => arr.indexOf(w) === i);

    if (words.length < 5) return null;

    return { theme: `${theme.emoji} ${theme.name}`, words };
  } catch (err) {
    console.error('AI word generation error:', err.message);
    return null;
  }
}

function randomFallback() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}
