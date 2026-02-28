const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function updateManga() {
    // Ensure we are looking for the file in the root directory
    const filePath = path.join(process.cwd(), 'manga_data.json');
    let localData = [];
    
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            localData = JSON.parse(content || '[]');
        } catch (e) {
            localData = [];
        }
    }

    try {
        console.log("Fetching random manga...");
        // includes[]=cover_art allows us to get the filename without a second API call
        const res = await axios.get('https://api.mangadex.org/manga/random', {
            params: {
                'contentRating[]': ['safe', 'suggestive'],
                'includes[]': ['cover_art'],
                'availableTranslatedLanguage[]': ['en']
            }
        });

        const manga = res.data.data;
        const mangaId = manga.id;
        
        // Find English title safely
        const title = manga.attributes.title.en || 
                      (manga.attributes.altTitles.find(t => t.en) || {}).en || 
                      Object.values(manga.attributes.title)[0];

        if (!title) {
            console.log("No clear title found, skipping...");
            return;
        }

        // Avoid Duplicates
        if (localData.some(m => m.id === mangaId)) {
            console.log(`Duplicate found (${title}), skipping...`);
            return;
        }

        // Get Cover Image from expanded relationship
        const coverRel = manga.relationships.find(r => r.type === 'cover_art');
        if (!coverRel || !coverRel.attributes) {
            console.log("No cover art attributes found, skipping...");
            return;
        }
        
        const fileName = coverRel.attributes.fileName;
        const coverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.256.jpg`;

        // Add to the TOP of the list
        localData.unshift({ 
            id: mangaId, 
            title: title, 
            cover: coverUrl,
            updatedAt: new Date().toISOString() 
        });

        // Keep only the most recent 24 (nice for a grid)
        const updatedData = localData.slice(0, 24);

        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        console.log(`Successfully added: ${title}`);

    } catch (err) {
        console.error("Critical API Error:", err.response ? err.response.data : err.message);
    }
}

updateManga();
