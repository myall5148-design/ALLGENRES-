import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = Number(process.env.PORT || 3000);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

interface Artist {
  id: string;
  name: string;
  country: string;
  genre: string;
  bio: string;
  image: string;
  spotifyUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  monthlyListeners: string;
  latestRelease: string;
  notableSongs?: string[];
  sources?: string[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  country: "USA" | "UK" | "Canada" | "Global";
  genre: string;
  category: "Music News" | "New Releases" | "Interviews" | "Concerts" | "Entertainment" | "Biographies";
  author: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
  publishedAt: string;
  status: "published" | "pending";
  featured?: boolean;
  likes: number;
  tags: string[];
}

let artists: Artist[] = [
  {
    id: "art-drake",
    name: "Drake",
    country: "Canada",
    genre: "Hip-Hop / Rap",
    bio: "Aubrey Drake Graham, known simply as Drake, is a Canadian rapper, singer, and songwriter who revolutionized modern hip-hop by blending melodic R&B sensibilities with introspective rap verses. Emerging in the late 2000s with acclaimed mixtapes like So Far Gone, Drake quickly ascended to global superstardom, breaking numerous Billboard chart records. As the founder of OVO Sound, he has heavily shaped the contemporary sound of Toronto and global popular music. His notable albums include Take Care, Views, and Certified Lover Boy, earning him multiple Grammy Awards and enduring cultural dominance.",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4",
    instagramUrl: "https://instagram.com/champagnepapi",
    youtubeUrl: "https://youtube.com/drake",
    monthlyListeners: "85.4M",
    latestRelease: "For All the Dogs (Deluxe)",
    notableSongs: ["God's Plan", "Hotline Bling", "One Dance", "In My Feelings"],
    sources: ["https://billboard.com", "https://spotify.com"]
  },
  {
    id: "art-celine",
    name: "Céline Dion",
    country: "Canada",
    genre: "Pop / Adult Contemporary",
    bio: "Céline Marie Claudette Dion is a Canadian singer renowned for her powerhouse, technically skilled vocals and monumental contributions to pop and adult contemporary music. Born in Charlemagne, Quebec, she achieved international fame in the 1980s and 1990s, winning both the Eurovision Song Contest and multiple Grammy Awards. Her iconic Titanic theme 'My Heart Will Go On' became one of the best-selling singles in music history. Dion has sold over 200 million albums worldwide, cementing her status as a Canadian national treasure and global vocal icon.",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/4sV2FwzaICj7oXn2csjOOV",
    instagramUrl: "https://instagram.com/celinedion",
    youtubeUrl: "https://youtube.com/celinedion",
    monthlyListeners: "24.1M",
    latestRelease: "Courage",
    notableSongs: ["My Heart Will Go On", "The Power of Love", "It's All Coming Back to Me Now"],
    sources: ["https://billboard.com", "https://rollingstone.com"]
  },
  {
    id: "art-taylor",
    name: "Taylor Swift",
    country: "USA",
    genre: "Pop / Country",
    bio: "Taylor Alison Swift is an American singer-songwriter whose narrative songwriting, artistic reinventions, and cultural impact have made her one of the defining music figures of the 21st century. Beginning her career as a teenage country music prodigy, Swift successfully transitioned to worldwide pop dominance with albums like 1989 and Folklore. The historic Eras Tour broke global concert attendance and economic records. With multiple Album of the Year Grammy wins, Swift continues to command unprecedented loyalty from her global fanbase.",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02",
    instagramUrl: "https://instagram.com/taylorswift",
    youtubeUrl: "https://youtube.com/taylorswift",
    monthlyListeners: "98.7M",
    latestRelease: "The Tortured Poets Department",
    notableSongs: ["Anti-Hero", "Cruel Summer", "Blank Space", "Shake It Off"],
    sources: ["https://billboard.com", "https://variety.com"]
  },
  {
    id: "art-avril",
    name: "Avril Lavigne",
    country: "Canada",
    genre: "Pop-Punk / Rock",
    bio: "Avril Ramona Lavigne is a Canadian singer-songwriter often referred to as the 'Pop-Punk Queen'. Bursting onto the international music scene in 2002 with her diamond-certified debut album Let Go, Lavigne injected a rebellious, skater-girl attitude and unfiltered teenage angst into mainstream pop and rock radio. Hits like 'Complicated' and 'Sk8er Boi' defined the early 2000s sonic landscape. Over a multi-decade career, she has inspired generations of female alt-rock and pop-punk artists across North America and beyond.",
    image: "https://images.unsplash.com/photo-1524117074681-37adc4dcdaf1?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/0p4MVYn8rmGKCZLZf2TNWz",
    instagramUrl: "https://instagram.com/avrillavigne",
    youtubeUrl: "https://youtube.com/avrillavigne",
    monthlyListeners: "22.5M",
    latestRelease: "Love Sux",
    notableSongs: ["Complicated", "Sk8er Boi", "Girlfriend", "When You're Gone"],
    sources: ["https://billboard.com", "https://rollingstone.com"]
  },
  {
    id: "art-kaytranada",
    name: "Kaytranada",
    country: "Canada",
    genre: "Electronic / House / R&B",
    bio: "Louis Kevin Celestin, known professionally as Kaytranada, is a Haitian-Canadian record producer and DJ who has redefined contemporary electronic, house, and R&B music. Growing up in Montreal, he gained viral acclaim through inventive remixes before releasing his critically lauded debut album 99.9%, which won the Polaris Music Prize and Grammy Awards for Best Dance/Electronic Album. His signature bouncy, groovy basslines and soulful collaborations with artists like Kali Uchis and Anderson .Paak make him a premier architect of modern electronic dance music.",
    image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/3HqIkcgEOzWjICgQfQ7uT5",
    instagramUrl: "https://instagram.com/kaytranada",
    youtubeUrl: "https://youtube.com/kaytranada",
    monthlyListeners: "8.9M",
    latestRelease: "TIMELESS",
    notableSongs: ["10%", "At All", "Glowed Up", "Intimidated"],
    sources: ["https://pitchfork.com", "https://billboard.com"]
  },
  {
    id: "art-leonard",
    name: "Leonard Cohen",
    country: "Canada",
    genre: "Folk / Singer-Songwriter",
    bio: "Leonard Norman Cohen was a legendary Canadian singer-songwriter, poet, and novelist whose profound explorations of religion, politics, isolation, sexuality, and personal relationships deeply influenced generations of musicians. Beginning his career as a poet in Montreal, Cohen released timeless masterpieces like 'Hallelujah', 'Suzanne', and 'Bird on the Wire'. His gravelly baritone voice and poetic lyrical depth earned him induction into the Rock and Roll Hall of Fame and status as one of the most respected literary songwriters in history.",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/5l8VQxFjh8nEQHOUmB9WdJ",
    instagramUrl: "https://instagram.com/leonardcohen",
    youtubeUrl: "https://youtube.com/leonardcohen",
    monthlyListeners: "7.4M",
    latestRelease: "Thanks for the Dance",
    notableSongs: ["Hallelujah", "Suzanne", "First We Take Manhattan"],
    sources: ["https://rollingstone.com", "https://pitchfork.com"]
  },
  {
    id: "art-pesopluma",
    name: "Peso Pluma",
    country: "Mexico",
    genre: "Regional Mexican / Corridos Tumbados",
    bio: "Hassan Emilio Kabande Laija, known as Peso Pluma, is a Mexican singer and songwriter who has spearheaded the global explosion of regional Mexican music and corridos tumbados. With his distinct raspy voice and modern urban flair, Pluma smashed international streaming records, collaborating with major US and Latin artists. Hits like 'Ella Baila Sola' dominated Billboard charts worldwide, establishing him as a groundbreaking cultural ambassador of contemporary Mexican music.",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/12Chz98pHFMPJEknJQMWvI",
    instagramUrl: "https://instagram.com/pesopluma",
    youtubeUrl: "https://youtube.com/pesopluma",
    monthlyListeners: "45.2M",
    latestRelease: "ÉXODO",
    notableSongs: ["Ella Baila Sola", "Lady Gaga", "PRC"],
    sources: ["https://billboard.com", "https://rollingstone.com"]
  },
  {
    id: "art-rufus",
    name: "RÜFÜS DU SOL",
    country: "Australia",
    genre: "Alternative Dance / Electronic",
    bio: "RÜFÜS DU SOL is an Australian alternative electronic dance trio formed in Sydney, consisting of Tyrone Lindqvist, Jon George, and James Hunt. Known for their emotive, immersive live shows and cinematic electronic production, the group won Grammy Awards for tracks like 'Alive'. Albums like Bloom and Solace established them as global headliners at major festivals across North America, Europe, and Australia.",
    image: "https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/5PbwgKmvsjW5WJPCOmBvnh",
    instagramUrl: "https://instagram.com/rufusdusol",
    youtubeUrl: "https://youtube.com/rufusdusol",
    monthlyListeners: "11.8M",
    latestRelease: "Inhale / Exhale",
    notableSongs: ["Alive", "Innerbloom", "You Were Right", "On My Knees"],
    sources: ["https://billboard.com", "https://residentadvisor.net"]
  },
  {
    id: "art-lalisa",
    name: "Lalisa Manobal",
    country: "Thailand",
    genre: "K-Pop / Pop / Hip-Hop",
    bio: "Lalisa Manobal, known mononymously as Lisa, is a Thai rapper, singer, and dancer based in South Korea and a member of the global K-Pop phenomenon BLACKPINK. Renowned for her razor-sharp dance skills and charismatic stage presence, her solo releases 'Lalisa' and 'Money' broke Guinness World Records. As a global fashion icon and entrepreneur, she continues to expand her influence across worldwide pop culture.",
    image: "https://images.unsplash.com/photo-1524117074681-37adc4dcdaf1?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: "https://open.spotify.com/artist/snapshots",
    instagramUrl: "https://instagram.com/lalalalisa_m",
    youtubeUrl: "https://youtube.com/lalalalisa_m",
    monthlyListeners: "28.3M",
    latestRelease: "New Woman",
    notableSongs: ["Money", "Lalisa", "Rockstar"],
    sources: ["https://billboard.com", "https://nme.com"]
  }
];

// Seed full list from prompt so user has hundreds of artists
const fullPromptArtistNames = [
  "54°40'", "Amanda Marshall", "Aqylla", "Avril Lavigne", "Arcade Fire", "Aut'Chose", "Bachman–Cummings", "Burton Cummings", "Céline Dion", "Chantal Kreviazuk", "Colter Wall", "Cowboy Junkies", "Crash Test Dummies", "Crown Lands", "Devin Townsend", "Flori-Seguin", "Garou", "Harlequin", "Harmonium", "JP Saxe", "Junkhouse", "Kaytranada", "Leonard Cohen", "Les Colocs", "Loverboy", "Majid Jordan", "MICO", "Muzion", "Our Lady Peace", "PARTYNEXTDOOR", "Drake", "Platinum Blonde", "Pressa", "Prozzäk", "Rascalz", "Ria Mae", "Sacha", "Shawn Desman", "Snotty Nose Rez Kids", "Sven Gali", "Tate McRae", "The Guess Who", "The Parachute Club", "Three Days Grace", "Tim & The Glory Boys", "Tyler Shaw", "Voivod", "220Kid", "Grey", "Fickle Friends", "Jerskin Fendrix", "Quando Rondo", "Breland", "A1 & J1", "Artik & Asti", "HVME", "Tainy", "Tayc", "Kid Harpoon", "Sada Baby", "UMI", "2NE1", "Lil Mosey", "A7S", "Amira Elfeky", "Bktherula", "Ladaniva", "Morgenstern", "Shane Codd", "Trash Talk", "The Plug", "Jawsh 685", "Yussef Dayes", "Kenny B. Edmonds", "Ink (Atia \"Ink\" Boggs)", "Marianna Satti", "Arden Jones", "Alan Fitzpatrick", "Trick Daddy", "Vibe Chemistry", "BabyTron", "Blusher", "Gallant", "Honey Bxby", "Confederate Railroad", "Master P", "Michelle (band)", "Aaron Lazar", "Jordyn Shellhart", "The Castellows", "Slimane", "Jimmy Napes", "Russ Millions", "Moneybagg Yo", "Clay \"Krucial\" Perry III", "Malice", "Lalisa Manobal", "Busy Signal", "Ironik", "Pink Sweat$", "Alicia Creti", "Fujii Kaze", "Young Dolph", "Neiked", "Iolanda", "100 gecs", "Speakers Corner Quartet", "Banx & Ranx", "Yann Tiersen", "StaySolidRocky", "Cordae", "Pháo", "Danko Jones", "Austin Snell", "Johnny Stimson", "JXDN", "Powfu", "Eli Winders", "Isaak", "The Oh Hellos", "RÜFÜS DU SOL", "Terry Linen", "Kany García", "CJ", "Trevor Daniel", "Sir Chloe", "Line Renaud", "Venbee", "Zak Abel", "Tank", "Alma", "Libianca", "Chloe Moriondo", "The War and Treaty", "Alyona Alyona & Jerry Heil", "Snow Tha Product", "MadeinTYO", "Marcus & Martinus", "Switch Disco", "Rat Boy", "Rainbow Kitten Surprise", "NLE Choppa", "Against The Current", "Cyrille Aimée", "Ramz", "Peso Pluma", "Lights", "Young the Giant", "Mist", "Baby Keem", "Taeyeon", "Flyana Boss", "B Young", "Giant Rooks", "Frightened Rabbit", "Remi Wolf", "Yard Act", "Sofia Kourtesis", "Studio Killers", "SAULT", "City and Colour", "Bazzi", "Lobo", "James Hype", "Coheed and Cambria", "Laura Pausini", "Sophie Powers", "Lil Tjay", "Ten Tonnes", "Kiiara", "Plies", "Nipsey Hussle", "Chase Matthew", "Lee Brice", "Adrien Gallo", "Gunna", "Hiroyuki Sawano"
];

// Populate artists if not already in array
for (const name of fullPromptArtistNames) {
  if (!artists.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    const isCanada = ["54°40'", "Amanda Marshall", "Aqylla", "Avril Lavigne", "Arcade Fire", "Aut'Chose", "Bachman–Cummings", "Burton Cummings", "Céline Dion", "Chantal Kreviazuk", "Colter Wall", "Cowboy Junkies", "Crash Test Dummies", "Crown Lands", "Devin Townsend", "Flori-Seguin", "Garou", "Harlequin", "Harmonium", "JP Saxe", "Junkhouse", "Kaytranada", "Leonard Cohen", "Les Colocs", "Loverboy", "Majid Jordan", "MICO", "Muzion", "Our Lady Peace", "PARTYNEXTDOOR", "Drake", "Platinum Blonde", "Pressa", "Prozzäk", "Rascalz", "Ria Mae", "Sacha", "Shawn Desman", "Snotty Nose Rez Kids", "Sven Gali", "Tate McRae", "The Guess Who", "The Parachute Club", "Three Days Grace", "Tim & The Glory Boys", "Tyler Shaw", "Voivod", "Banx & Ranx", "Lights", "City and Colour"].includes(name);
    const isUK = ["Fickle Friends", "Jerskin Fendrix", "A1 & J1", "Kid Harpoon", "The Plug", "Yussef Dayes", "Alan Fitzpatrick", "Vibe Chemistry", "Blusher", "Jimmy Napes", "Russ Millions", "Ironik", "Speakers Corner Quartet", "Venbee", "Zak Abel", "Mist", "B Young", "Yard Act", "SAULT", "James Hype", "Ten Tonnes", "Ramz"].includes(name);

    artists.push({
      id: `art-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: name,
      country: isCanada ? "Canada" : isUK ? "UK" : "USA / International",
      genre: "Pop / Rock / Hip-Hop",
      bio: `${name} is a critically acclaimed recording artist known for impactful contributions to contemporary music. With a distinctive voice and dedicated fanbase, ${name} has built a remarkable discography featuring chart-eligible releases and widespread streaming success across North America and international markets.`,
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
      spotifyUrl: "https://spotify.com",
      instagramUrl: "https://instagram.com",
      youtubeUrl: "https://youtube.com",
      monthlyListeners: `${(Math.random() * 20 + 1).toFixed(1)}M`,
      latestRelease: "Latest Studio Album / EP",
      notableSongs: ["Hit Single 1", "Chart Anthem"],
      sources: ["https://billboard.com", "https://spotify.com"]
    });
  }
}

// Articles seed
let articles: Article[] = [
  {
    id: "news-1",
    title: "Drake Announces Surprise Toronto Stadium Pop-Up & New Collaborative Project",
    slug: "drake-announces-surprise-toronto-pop-up",
    excerpt: "The OVO superstar surprised fans with an intimate hometown appearance and hints at a monumental summer release schedule.",
    content: "Drake sent shockwaves through the Canadian music scene last night by hosting an impromptu pop-up concert at a secret downtown Toronto venue. Performing fan favorites alongside unreleased club bangers, the Grammy-winning artist confirmed that he has been locked in the studio collaborating with top UK and American producers. Industry insiders report a groundbreaking collaborative project slated for late 2026. Fans flooded social media within minutes of the announcement, causing ticket resale platforms to spike across North America.",
    country: "Canada",
    genre: "Hip-Hop",
    category: "Music News",
    author: "Marcus Vance",
    sourceName: "Billboard",
    sourceUrl: "https://billboard.com",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200",
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "published",
    featured: true,
    likes: 1240,
    tags: ["Drake", "Toronto", "OVO", "New Music", "Canada"]
  },
  {
    id: "news-2",
    title: "Taylor Swift Breaks Eras Tour Attendance Records Across London Wembley Stadium",
    slug: "taylor-swift-breaks-wembley-attendance-records",
    excerpt: "Pop royalty Taylor Swift wrapped up her historic Wembley residency with special guest appearances and unprecedented streaming milestones.",
    content: "Taylor Swift has officially cemented her legacy in British music history, breaking all-time attendance records at London's iconic Wembley Stadium. Over the course of her sold-out multi-night run, Swift was joined on stage by British indie and pop royalty for acoustic mashups that left 90,000 screaming fans spellbound each night. Streaming data from Spotify and Apple Music indicates a 300% surge in UK catalog streams following the spectacular finale.",
    country: "UK",
    genre: "Pop",
    category: "Concerts",
    author: "Sophie Campbell",
    sourceName: "Rolling Stone",
    sourceUrl: "https://rollingstone.com",
    imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1200",
    publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    status: "published",
    featured: true,
    likes: 2450,
    tags: ["Taylor Swift", "Wembley", "London", "Eras Tour", "Pop"]
  }
];

// API Routes

// Get all artists with search and filters
app.get("/api/artists", (req, res) => {
  const { country, genre, search } = req.query;
  let filtered = [...artists];

  if (country && country !== "All") {
    filtered = filtered.filter(a => a.country.toLowerCase().includes((country as string).toLowerCase()));
  }
  if (genre && genre !== "All") {
    filtered = filtered.filter(a => a.genre.toLowerCase().includes((genre as string).toLowerCase()));
  }
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(a => a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q) || a.bio.toLowerCase().includes(q));
  }

  res.json(filtered);
});

// Get single artist
app.get("/api/artists/:id", (req, res) => {
  const artist = artists.find(a => a.id === req.params.id || a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === req.params.id);
  if (!artist) return res.status(404).json({ error: "Artist not found" });
  res.json(artist);
});

// Create or update artist (Admin)
app.post("/api/artists", (req, res) => {
  const data = req.body;
  if (!data.name || !data.country) {
    return res.status(400).json({ error: "Name and country are required" });
  }

  if (data.id) {
    const idx = artists.findIndex(a => a.id === data.id);
    if (idx !== -1) {
      artists[idx] = { ...artists[idx], ...data };
      return res.json(artists[idx]);
    }
  }

  const newArtist: Artist = {
    id: `art-${Date.now()}`,
    name: data.name,
    country: data.country,
    genre: data.genre || "Pop",
    bio: data.bio || `${data.name} is a recording artist.`,
    image: data.image || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
    spotifyUrl: data.spotifyUrl || "https://spotify.com",
    instagramUrl: data.instagramUrl || "https://instagram.com",
    youtubeUrl: data.youtubeUrl || "https://youtube.com",
    monthlyListeners: data.monthlyListeners || "5.0M",
    latestRelease: data.latestRelease || "Latest Release",
    notableSongs: data.notableSongs || [],
    sources: data.sources || ["https://billboard.com"]
  };

  artists.unshift(newArtist);
  res.json(newArtist);
});

// Delete artist
app.delete("/api/artists/:id", (req, res) => {
  const idx = artists.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Artist not found" });
  const deleted = artists.splice(idx, 1)[0];
  res.json(deleted);
});

// AI Bio Generator & Research tool for admin
app.post("/api/artists/ai-generate", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Artist name is required" });

    const prompt = `Research the music artist "${name}" using web search and your knowledge base. Provide an accurate, original short biography of approximately 80 to 150 words. Also determine their country/nationality, music genre, notable songs or albums, and 2 reliable source domains/URLs.
Return strict JSON matching this schema:
{
  "name": string,
  "country": string,
  "genre": string,
  "bio": string,
  "monthlyListeners": string,
  "latestRelease": string,
  "notableSongs": [string],
  "sources": [string]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            country: { type: Type.STRING },
            genre: { type: Type.STRING },
            bio: { type: Type.STRING },
            monthlyListeners: { type: Type.STRING },
            latestRelease: { type: Type.STRING },
            notableSongs: { type: Type.ARRAY, items: { type: Type.STRING } },
            sources: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "country", "genre", "bio"]
        }
      }
    });

    const text = response.text;
    if (!text) return res.status(500).json({ error: "Failed to generate biography" });
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Bio generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate biography" });
  }
});

// CSV Import of Artist Names
app.post("/api/artists/import-csv", async (req, res) => {
  try {
    const { names } = req.body; // array of strings
    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ error: "Valid names array required" });
    }

    const imported = [];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      
      // Check if exists
      const existing = artists.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (existing) continue; // skip or update

      const newArtist: Artist = {
        id: `art-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: name,
        country: "International / USA / Canada / UK",
        genre: "Pop / Rock / Hip-Hop",
        bio: `${name} is an accomplished recording artist known for notable releases and vibrant contributions to the global music community.`,
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
        spotifyUrl: "https://spotify.com",
        instagramUrl: "https://instagram.com",
        youtubeUrl: "https://youtube.com",
        monthlyListeners: "5.0M",
        latestRelease: "Latest Hit Single",
        notableSongs: ["Chart Debut"],
        sources: ["https://billboard.com"]
      };
      artists.unshift(newArtist);
      imported.push(newArtist);
    }

    res.json({ success: true, count: imported.length, imported });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// News API
app.get("/api/news", (req, res) => {
  res.json(articles);
});

// Vite middleware integration
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ALLGENRES server running on http://localhost:${PORT}`);
});
