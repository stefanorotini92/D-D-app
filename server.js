const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // per generare ID unici
const app = express();

app.use(express.json());

// Serve file statici dalla cartella "public"
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------
// Memoria temporanea personaggi
// ------------------------
let characters = [];

// ------------------------
// API: GET /api/characters
// ------------------------
app.get('/api/characters', (req, res) => {
  res.json(characters);
});

// ------------------------
// API: POST /api/characters
// ------------------------
app.post('/api/characters', (req, res) => {
  const data = req.body;

  if (!data.name) {
    return res.status(400).json({ error: 'Il personaggio deve avere un nome.' });
  }

  // Se ha già un ID => modifica
  if (data.id) {
    const index = characters.findIndex(c => c.id === data.id);
    if (index !== -1) {
      characters[index] = { ...characters[index], ...data };
      return res.json(characters[index]);
    } else {
      return res.status(404).json({ error: 'Personaggio non trovato per aggiornamento.' });
    }
  }

  // Nuovo personaggio
  const newChar = { ...data, id: uuidv4() };
  characters.push(newChar);
  res.json(newChar);
});

// ------------------------
// API: DELETE /api/characters/:id
// ------------------------
app.delete('/api/characters/:id', (req, res) => {
  const id = req.params.id;
  const index = characters.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Personaggio non trovato' });

  characters.splice(index, 1);
  res.json({ success: true });
});

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
