const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ROUTE: controllo server
app.get("/health", (req, res) => res.json({ ok: true }));

// ROUTE: ottenere tutti i personaggi
app.get("/characters", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM characters ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Errore fetch characters:", err.message);
    res.status(500).json({ error: "Errore fetch characters", details: err.message });
  }
});

// ROUTE: creare un nuovo personaggio (solo campi base)
app.post("/characters", async (req, res) => {
  const {
    name, class: pgClass, race, level,
    strength, dexterity, constitution, intelligence, wisdom, charisma
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO characters 
      (name, class, race, level, strength, dexterity, constitution, intelligence, wisdom, charisma)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [name, pgClass, race, level, strength, dexterity, constitution, intelligence, wisdom, charisma]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Errore creazione personaggio:", err.message);
    console.error(err.stack);
    console.error("Request body:", JSON.stringify(req.body));
    res.status(500).json({ error: "Errore creazione personaggio", details: err.message });
  }
});

// ROUTE: cancellare un personaggio (opzionale)
app.delete("/characters/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM characters WHERE id = $1 RETURNING *", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Personaggio non trovato" });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("Errore delete character:", err.message);
    res.status(500).json({ error: "Errore delete character", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server attivo sulla porta ${port}`);
});
