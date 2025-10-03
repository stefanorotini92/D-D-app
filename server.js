// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Path file dati
const DATA_FILE = path.join(__dirname, 'characters.json');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // serve index.html dalla cartella public

// Funzione per leggere dati
function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content) || [];
  } catch (err) {
    console.error('Errore lettura file:', err);
    return [];
  }
}

// Funzione per salvare dati
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generatore semplice di ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
}

// ------------------ API ------------------

// GET /api/characters
app.get('/api/characters', (req, res) => {
  const chars = readData();
  res.json(chars);
});

// POST /api/characters
app.post('/api/characters', (req, res) => {
  const chars = readData();
  const data = req.body;

  // Se c'è id modifica, altrimenti nuovo
  if (data.id) {
    const idx = chars.findIndex(c => c.id === data.id);
    if (idx !== -1) chars[idx] = data;
    else chars.push(data);
  } else {
    data.id = generateId();
    chars.push(data);
  }

  saveData(chars);
  res.json(data);
});

// DELETE /api/characters/:id
app.delete('/api/characters/:id', (req, res) => {
  const chars = readData();
  const filtered = chars.filter(c => c.id !== req.params.id);
  saveData(filtered);
  res.json({ deleted: req.params.id });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});
