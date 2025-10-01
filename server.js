const express = require("express");
const app = express();
app.use(express.json());

let characters = []; // Lista dei personaggi

// Endpoint per vedere tutti i personaggi
app.get("/characters", (req, res) => {
  res.json(characters);
});

// Endpoint per creare un nuovo personaggio
app.post("/characters", (req, res) => {
  const character = req.body;
  characters.push(character);
  res.json(character);
});

// Avvio server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server attivo su porta ${port}`));
