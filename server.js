require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Sécurité : on vérifie la clé au démarrage
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY introuvable dans les variables d’environnement');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { titre, contenu, auteur } = req.body;

  if (!titre || !contenu || !auteur) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const prompt = `
Tu es un écrivain français talentueux. Écris une longue histoire à partir du titre suivant : "${titre}".
Le contenu ou thème principal est : "${contenu}".
L’histoire doit être riche, détaillée, avec des dialogues, des descriptions, et une narration fluide.
Mets les **noms de personnages** en **gras**, et les **noms de lieux** en *italique*.
À la fin, signe l’histoire avec l’auteur : ***${auteur}***.
`;

  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 2_500
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const story = data.choices[0].message.content;
    res.json({ story });
  } catch (err) {
    console.error('OpenAI error :', err.response?.data || err.message);
    res.status(500).json({ error: 'Erreur lors de la génération.' });
  }
});

app.listen(PORT, () => console.log(`✅ Serveur démarré sur le port ${PORT}`));
    
