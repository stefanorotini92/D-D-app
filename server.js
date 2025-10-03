// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Percorso file dati
const DATA_FILE = path.join(__dirname, "characters.json");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Legge personaggi dal file
function loadCharacters() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    console.error("Errore lettura file:", e);
    return [];
  }
}

// Salva personaggi sul file
function saveCharacters(chars) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(chars, null, 2), "utf8");
}

// API: lista personaggi
app.get("/api/characters", (req, res) => {
  const characters = loadCharacters();
  res.json(characters);
});

// API: crea personaggio
app.post("/api/characters", (req, res) => {
  const characters = loadCharacters();
  const newChar = req.body;

  if (!newChar.id) {
    newChar.id = Date.now(); // id univoco
  }

  // se esiste già -> aggiorno
  const idx = characters.findIndex(c => c.id === newChar.id);
  if (idx >= 0) {
    characters[idx] = newChar;
  } else {
    characters.push(newChar);
  }

  saveCharacters(characters);
  res.json(newChar);
});

// API: elimina personaggio
app.delete("/api/characters/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  let characters = loadCharacters();
  characters = characters.filter(c => c.id !== id);
  saveCharacters(characters);
  res.json({ success: true });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
