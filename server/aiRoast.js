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
  { name: 'Indian Food', emoji: '🍛', prompt: 'famous Indian foods, dishes, snacks, and drinks (like samosa, chai, biryani, paneer, dosa, jalebi)' },
  { name: 'Bollywood', emoji: '🎬', prompt: 'iconic Bollywood things you can draw — props, items, gestures, vehicles from famous scenes (like rickshaw, mustache, dupatta, dhol)' },
  { name: 'Indian Festivals', emoji: '🎆', prompt: 'things seen during Indian festivals like Diwali, Holi, Navratri, Eid, Christmas (like rangoli, firecracker, gulaal, lantern, garba)' },
  { name: 'Cricket', emoji: '🏏', prompt: 'things related to cricket — equipment, actions, famous things in cricket (like bat, wicket, sixer, umpire, trophy)' },
  { name: 'Indian Streets', emoji: '🛺', prompt: 'things you see on Indian streets and roads (like autorickshaw, chai-stall, cow, pothole, billboard, temple)' },
  { name: 'World Landmarks', emoji: '🇮🇳', prompt: 'famous world landmarks and monuments you can draw (like Tajmahal, Eiffel Tower, Pyramid, Colosseum, Statue of Liberty)' },
  { name: 'Tech & Internet', emoji: '💻', prompt: 'famous tech things, apps, gadgets, and internet culture items you can draw (like iPhone, laptop, wifi, robot, hashtag, selfie)' },
  { name: 'Superheroes', emoji: '🦸', prompt: 'famous superheroes, villains, and their iconic items (like Thor, Batman, shield, cape, Hulk, Spiderman, Thanos)' },
  { name: 'Indian Wildlife', emoji: '🐯', prompt: 'animals and wildlife found in India (like tiger, peacock, cobra, elephant, monkey, parrot, camel)' },
  { name: 'World Cup Fever', emoji: '🏆', prompt: 'things related to sports tournaments, FIFA, Olympics, IPL (like trophy, medal, stadium, jersey, goalpost, mascot)' },
  { name: 'Indian Wedding', emoji: '👰', prompt: 'things seen at an Indian wedding (like mandap, baraat, mehndi, turban, lehenga, horse, drums)' },
  { name: 'College Life', emoji: '🎓', prompt: 'things from Indian college life (like canteen, hostel, maggi, backbench, exam, bicycle, library)' },
  { name: 'Viral Memes', emoji: '😂', prompt: 'real things or objects from famous viral memes and internet trends you can draw (like coffin, cat, doge, frog, stonks, keyboard)' },
  { name: 'Indian Transport', emoji: '🚌', prompt: 'Indian transportation and vehicles (like autorickshaw, train, bullockcart, scooter, bus, bicycle, boat)' },
  { name: 'Space & Science', emoji: '🚀', prompt: 'space and science things you can draw (like rocket, astronaut, planet, telescope, satellite, UFO, moon)' },
  { name: 'Desi Kitchen', emoji: '🍳', prompt: 'things found in an Indian kitchen (like pressure-cooker, rolling-pin, tawa, masala, chai, thali, mortar)' },
  { name: 'Gaming World', emoji: '🎮', prompt: 'famous video game characters and items (like Mario, sword, mushroom, controller, Pikachu, creeper, coin)' },
  { name: 'Indian Clothes', emoji: '👗', prompt: 'Indian clothing and accessories (like saree, turban, kurta, bindi, juttis, bangles, dupatta, lungi)' },
  { name: 'World Leaders', emoji: '🌍', prompt: 'things associated with famous world leaders or politicians that you can draw (like podium, flag, suit, microphone, glasses, crown)' },
  { name: 'Street Food India', emoji: '🍢', prompt: 'Indian street food items (like panipuri, chaatplate, kulfi, vada-pav, momos, bhelpuri, sugarcane)' },
];

export async function generateAIWords() {
  if (!groq) return null;

  // Pick 5 random themes for variety instead of locking to one
  const shuffled = [...WORD_THEMES].sort(() => Math.random() - 0.5);
  const selectedThemes = shuffled.slice(0, 5);
  const themeDescriptions = selectedThemes.map((t) => t.prompt).join('; ');

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: 'You generate word lists for a drawing game. Words MUST be drawable. Return ONLY a JSON array of 30 unique words. IMPORTANT RULES: Prefer single words (like "samosa", "rocket", "tiger"). Two words max (like "cricket bat"). NEVER use 3+ word phrases. No sentences. No abstract concepts. Keep it simple and fun. Pick words from ALL the categories given — do NOT focus on just one.',
        },
        {
          role: 'user',
          content: `Generate 30 drawable words, mixing these categories: ${themeDescriptions}. Return only a JSON array like ["word1", "word2", ...]. No explanation.`,
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
      .filter((w) => typeof w === 'string' && w.length > 0 && w.length <= 20)
      .map((w) => w.toLowerCase().trim())
      .filter((w) => w.split(/\s+/).length <= 2)
      .filter((w, i, arr) => arr.indexOf(w) === i);

    if (words.length < 5) return null;

    return { words };
  } catch (err) {
    console.error('AI word generation error:', err.message);
    return null;
  }
}

function randomFallback() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}
