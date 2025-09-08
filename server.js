require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY manquante');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Génération d’un épisode
app.post('/api/generate', async (req, res) => {
  const { num, mainTitle, characters, summary, wordCount, userPrompt, isEnd } = req.body;
  const isBeforeLast = num === 999; // exemple

  const prompt = `
Résumé global :
${summary}

Personnages actuels :
${characters}

Titre général : ${mainTitle}
Épisode demandé : ${num}
Mots souhaités : ${wordCount || 2000}
${userPrompt ? 'Contenu additionnel de l’utilisateur : ' + userPrompt : ''}
${isBeforeLast ? 'Insère en début d’épisode la mention **Avant-dernier épisode**.' : ''}
${isEnd ? 'Cet épisode doit clore la série principale.' : ''}

Rédige l’épisode ${num} (≈ ${wordCount || 2000} mots) :
- introduction, développement, cliffhanger ou conclusion
- **noms** en gras, *lieux* en italique
- finir par « RÉSUMÉ : » (3 lignes max)
  `;

  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: Math.round((wordCount || 2000) * 1.5)
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const full = data.choices[0].message.content.trim();
    const parts = full.split('RÉSUMÉ:');
    const content = parts[0].trim();
    const summary = parts[1]?.trim() || 'Résumé non généré';
    res.json({ content, summary });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Erreur génération épisode.' });
  }
});

// Génération épilogue
app.post('/api/epilogue', async (req, res) => {
  const { mainTitle, characters, summary } = req.body;
  const prompt = `
Série : ${mainTitle}
Personnages finaux : ${characters}
Résumé global : ${summary}

Rédige un **épilogue** de 800 mots :
- clôture émotive, destin des personnages
- ouverture possible
- **noms** en gras, *lieux* en italique
  `;
  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1200 },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    res.json({ epilogue: data.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Erreur épilogue.' });
  }
});

// Téléchargement PDF
app.post('/api/export-pdf', (req, res) => {
  const html = req.body.html;
  const title = req.body.title || 'serie';
  const fileName = `${title.replace(/\s+/g, '_')}.html`;
  const filePath = path.join(__dirname, 'public', fileName);
  fs.writeFileSync(filePath, html);
  res.download(filePath, fileName, () => fs.unlinkSync(filePath));
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
      
