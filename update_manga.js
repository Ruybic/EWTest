const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function updateManga() {
    const filePath = path.join(process.cwd(), 'manga_data.json');
    let localData = [];
    
    if (fs.existsSync(filePath)) {
        localData = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    }

    try {
        console.log("🎲 Rolling for random manga...");
        const res = await axios.get('https://api.mangadex.org/manga/random', {
            params: {
                'contentRating[]': ['safe', 'suggestive'],
                'includes[]': ['cover_art'],
                'availableTranslatedLanguage[]': ['en']
            }
        });

        const manga = res.data.data;
        const mangaId = manga.id;
        const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];

        // CHECK 1: Title exists?
        if (!title) throw new Error("No title found.");

        // CHECK 2: Is it a duplicate?
        if (localData.some(m => m.id === mangaId)) {
            throw new Error(`Duplicate found: ${title}`);
        }

        // CHECK 3: Has cover art?
        const coverRel = manga.relationships.find(r => r.type === 'cover_art');
        if (!coverRel || !coverRel.attributes) {
            throw new Error("Missing cover art.");
        }
        
        const fileName = coverRel.attributes.fileName;
        const coverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.256.jpg`;

        localData.unshift({ id: mangaId, title, cover: coverUrl, date: new Date().toISOString() });
        fs.writeFileSync(filePath, JSON.stringify(localData.slice(0, 24), null, 2));
        
        console.log(`✅ Success! Added: ${title}`);
        process.exit(0); // Tell GitHub it worked

    } catch (err) {
        console.log(`❌ Attempt failed: ${err.message}`);
        process.exit(1); // Tell GitHub to retry
    }
}

updateManga();
