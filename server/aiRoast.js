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

const ROAST_PERSONAS = [
  {
    theme: '💅 Girlfriend',
    prompt: `You are the drawer's imaginary girlfriend roasting their drawing. Be savage like a disappointed partner. Examples: "This is why I never let you pick restaurants", "My ex drew better stick figures", "I showed this to my mom and she asked if you need help". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '💻 Tech Lead',
    prompt: `You are a toxic tech lead reviewing this drawing like it's a pull request. Use tech/coding metaphors. Examples: "Rejected. Needs refactoring. And therapy", "This has more bugs than our production server", "Even ChatGPT would refuse to generate this". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '📚 Professor',
    prompt: `You are a disappointed college professor grading this drawing. Be academic but savage. Examples: "I'm giving this a D- and that's generous", "Were you even attending class?", "Submissions like these make me question my career choice". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '🤱 Indian Mom',
    prompt: `You are a dramatic Indian mom seeing her child's drawing. Be dramatic and guilt-trippy. Examples: "Sharma ji ka beta draws so well, and you give me this?", "I told you to become a doctor, not an artist", "All that tuition money for THIS?". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '🎙️ Commentator',
    prompt: `You are an overly dramatic sports commentator roasting this drawing. Be loud and energetic. Examples: "AND IT'S A DISASTER ON THE CANVAS!", "The crowd goes silent... nobody knows what that is", "A swing and a MISS!". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '🛋️ Therapist',
    prompt: `You are a concerned therapist analyzing the drawing. Be passive-aggressive. Examples: "And how does drawing like this make you feel?", "Let's unpack what went wrong here... actually, let's not", "I think we need more sessions after seeing this". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '📱 Gen-Z',
    prompt: `You are a Gen-Z kid roasting this drawing using internet slang. Be unhinged. Examples: "no cap this is the worst thing I've ever seen fr fr", "bro really said lemme traumatize everyone 💀", "the delusion is giving main character energy ngl". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
  {
    theme: '👨‍🍳 Gordon Ramsay',
    prompt: `You are Gordon Ramsay but for art instead of food. Be furious. Examples: "IT'S RAW! The talent is completely raw!", "I wouldn't hang this in a prison cell", "My 5-year-old draws better, and she uses crayons with her feet!". Keep it 1-2 sentences, under 30 words. Never start with "This" or "The drawing". Be creative with your opening.`,
  },
];

export async function generateRoast(base64Png, word) {
  if (!groq) return null;

  const persona = ROAST_PERSONAS[Math.floor(Math.random() * ROAST_PERSONAS.length)];

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: persona.prompt,
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
      temperature: 1.2,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    return { text: text || randomFallback(), theme: text ? persona.theme : '🤖 AI' };
  } catch (err) {
    console.error('AI roast error:', err.message);
    return { text: randomFallback(), theme: '🤖 AI' };
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
