const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function updateManga() {
    const filePath = path.join(process.cwd(), 'manga_data.json');
    let localData = [];
    
    if (fs.existsSync(filePath)) {
        try {
            localData = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        } catch (e) { localData = []; }
    }

    try {
        console.log("🎲 Rolling for any random manga...");
        
        // Simplified request to avoid 400 errors
        const res = await axios.get('https://api.mangadex.org/manga/random', {
            params: {
                'includes[]': ['cover_art']
            }
        });

        const manga = res.data.data;
        const attrs = manga.attributes;

        // 1. Language Check: Check if English is in the available languages
        const hasEnglish = attrs.availableTranslatedLanguages.includes('en');
        if (!hasEnglish) {
            throw new Error("Manga not available in English. Retrying...");
        }

        // 2. Title Check: Find any English title
        const title = attrs.title.en || 
                     (attrs.altTitles.find(t => t.en) || {}).en || 
                     Object.values(attrs.title)[0];

        if (!title) throw new Error("Could not determine a title.");

        // 3. Duplicate Check
        if (localData.some(m => m.id === manga.id)) {
            throw new Error(`Already have ${title}. Retrying...`);
        }

        // 4. Cover Art Check
        const coverRel = manga.relationships.find(r => r.type === 'cover_art');
        if (!coverRel || !coverRel.attributes) {
            throw new Error("No cover art found. Retrying...");
        }
        
        const fileName = coverRel.attributes.fileName;
        const coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.256.jpg`;

        // Success! Add to list
        localData.unshift({ 
            id: manga.id, 
            title: title, 
            cover: coverUrl, 
            time: new Date().toISOString() 
        });

        fs.writeFileSync(filePath, JSON.stringify(localData.slice(0, 24), null, 2));
        
        console.log(`✅ Success! Added: ${title}`);
        process.exit(0); 

    } catch (err) {
        console.log(`❌ ${err.message}`);
        process.exit(1); 
    }
}

updateManga();
