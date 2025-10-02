const express = require("express");
const path = require("path");
const { Pool } = require("pg"); // Importa PostgreSQL

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve file statici dalla cartella "public"

// Configura il database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Creazione automatica della tabella characters
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        race VARCHAR(50),
        class VARCHAR(50)
      )
    `);
    console.log("Tabella characters creata!");
  } catch (err) {
    console.error("Errore nella creazione della tabella:", err);
  }
})();

// Endpoint per ottenere tutti i personaggi
app.get("/characters", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM characters");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Errore nel recupero dei personaggi");
  }
});

// Endpoint per creare un nuovo personaggio
app.post("/characters", async (req, res) => {
  const { name, race, class: className } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO characters(name, race, class) VALUES($1, $2, $3) RETURNING *",
      [name, race, className]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Errore nella creazione del personaggio");
  }
});

// Avvio server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server attivo su porta ${port}`));
