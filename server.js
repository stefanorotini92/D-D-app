const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());

// Serve il frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Lista dei personaggi
let characters = [];
app.get("/characters", (req, res) => {
  res.json(characters);
});

// Crea un nuovo personaggio
app.post("/characters", (req, res) => {
  const character = req.body;
  characters.push(character);
  res.json(character);
});

// Avvio server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server attivo su porta ${port}`));
