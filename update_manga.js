const fs = require('fs');
const axios = require('axios');

async function updateManga() {
    const filePath = './manga_data.json';
    let localData = [];
    
    if (fs.existsSync(filePath)) {
        localData = JSON.parse(fs.readFileSync(filePath));
    }

    try {
        // Fetch 1 Random Manga (Filtered: Safe, English)
        const res = await axios.get('https://api.mangadex.org/manga/random', {
            params: {
                'contentRating[]': ['safe', 'suggestive'],
                'includedTagsMode': 'AND',
                'availableTranslatedLanguage[]': ['en']
            }
        });

        const manga = res.data.data;
        const mangaId = manga.id;
        const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];

        // Avoid Duplicates
        if (localData.some(m => m.id === mangaId)) {
            console.log("Duplicate found, skipping...");
            return;
        }

        // Get Cover Image
        const coverRel = manga.relationships.find(r => r.type === 'cover_art');
        const coverRes = await axios.get(`https://api.mangadex.org/cover/${coverRel.id}`);
        const coverFile = coverRes.data.data.attributes.fileName;
        const coverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${coverFile}.256.jpg`;

        // Add to list (Keep only last 20 to keep file small)
        localData.unshift({ id: mangaId, title, cover: coverUrl });
        const updatedData = localData.slice(0, 20);

        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        console.log(`Added: ${title}`);

    } catch (err) {
        console.error("API Error:", err.message);
    }
}

updateManga();
