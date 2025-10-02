const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Creazione tabella se non esiste
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        race TEXT NOT NULL,
        class TEXT NOT NULL
      );
    `);
    console.log("✅ Tabella 'characters' pronta!");
  } catch (err) {
    console.error("❌ Errore creazione tabella:", err);
  }
})();

// --- ENDPOINTS ---

// GET: Lista personaggi
app.get("/characters", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM characters ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Errore recupero personaggi:", err);
    res.status(500).send("Errore caricamento personaggi");
  }
});

// POST: Creare nuovo personaggio
app.post("/characters", async (req, res) => {
  console.log("📥 Ricevuto personaggio:", req.body);
  const { name, race, class: className } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO characters(name, race, class) VALUES($1, $2, $3) RETURNING *",
      [name, race, className]
    );
    console.log("✅ Personaggio salvato:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Errore salvataggio:", err);
    res.status(500).send("Errore creazione personaggio");
  }
});

// PUT: Aggiornare personaggio
app.put("/characters/:id", async (req, res) => {
  const { id } = req.params;
  const { name, race, class: className } = req.body;
  try {
    const result = await pool.query(
      "UPDATE characters SET name=$1, race=$2, class=$3 WHERE id=$4 RETURNING *",
      [name, race, className, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Personaggio non trovato");
    }
    console.log("✏️ Personaggio aggiornato:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Errore aggiornamento:", err);
    res.status(500).send("Errore aggiornamento personaggio");
  }
});

// DELETE: Eliminare personaggio
app.delete("/characters/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM characters WHERE id = $1", [id]);
    console.log(`🗑️ Personaggio eliminato ID: ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Errore eliminazione:", err);
    res.status(500).send("Errore eliminazione personaggio");
  }
});

// Avvio server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
});
