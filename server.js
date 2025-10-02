const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- MIGRAZIONE AUTOMATICA ---
(async () => {
  const cols = [
    `level INTEGER DEFAULT 1`,
    `background TEXT`,
    `player_name TEXT`,
    `alignment TEXT`,
    `xp INTEGER DEFAULT 0`,
    `inspiration BOOLEAN DEFAULT false`,
    `proficiency_bonus INTEGER DEFAULT 2`,
    `strength INTEGER`,
    `dexterity INTEGER`,
    `constitution INTEGER`,
    `intelligence INTEGER`,
    `wisdom INTEGER`,
    `charisma INTEGER`,
    `max_hp INTEGER`,
    `current_hp INTEGER`,
    `armor_class INTEGER`,
    `initiative INTEGER`,
    `speed INTEGER`,
    `hit_dice TEXT`,
    `death_saves_success INTEGER DEFAULT 0`,
    `death_saves_failure INTEGER DEFAULT 0`,
    `equipment TEXT`,
    `personality_traits TEXT`,
    `ideals TEXT`,
    `bonds TEXT`,
    `flaws TEXT`,
    `appearance TEXT`,
    `backstory TEXT`
  ];

  try {
    for (const def of cols) {
      const colName = def.split(' ')[0];
      await pool.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS ${def};`);
      console.log(`✅ Colonna verificata/creata: ${colName}`);
    }
    console.log("✅ Migrazione completata: tutte le colonne verificate/aggiunte.");
  } catch (err) {
    console.error("❌ Errore durante la migrazione automatica:", err);
  }
})();

// --- ENDPOINTS CRUD ---

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
  const char = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO characters(
        name, class, level, background, player_name, race, alignment, xp, inspiration, proficiency_bonus,
        strength, dexterity, constitution, intelligence, wisdom, charisma,
        max_hp, current_hp, armor_class, initiative, speed, hit_dice,
        death_saves_success, death_saves_failure,
        equipment, personality_traits, ideals, bonds, flaws, appearance, backstory
      ) VALUES(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,
        $23,$24,$25,$26,$27,$28,$29,$30,$31
      ) RETURNING *`,
      [
        char.name, char.class, char.level, char.background, char.player_name, char.race, char.alignment, char.xp, char.inspiration, char.proficiency_bonus,
        char.strength, char.dexterity, char.constitution, char.intelligence, char.wisdom, char.charisma,
        char.max_hp, char.current_hp, char.armor_class, char.initiative, char.speed, char.hit_dice,
        char.death_saves_success, char.death_saves_failure,
        char.equipment, char.personality_traits, char.ideals, char.bonds, char.flaws, char.appearance, char.backstory
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Errore salvataggio:", err);
    res.status(500).send("Errore creazione personaggio");
  }
});

// PUT: Aggiornare personaggio
app.put("/characters/:id", async (req, res) => {
  const { id } = req.params;
  const char = req.body;
  try {
    const result = await pool.query(
      `UPDATE characters SET
        name=$1, class=$2, level=$3, background=$4, player_name=$5, race=$6, alignment=$7, xp=$8, inspiration=$9, proficiency_bonus=$10,
        strength=$11, dexterity=$12, constitution=$13, intelligence=$14, wisdom=$15, charisma=$16,
        max_hp=$17, current_hp=$18, armor_class=$19, initiative=$20, speed=$21, hit_dice=$22,
        death_saves_success=$23, death_saves_failure=$24,
        equipment=$25, personality_traits=$26, ideals=$27, bonds=$28, flaws=$29, appearance=$30, backstory=$31
      WHERE id=$32 RETURNING *`,
      [
        char.name, char.class, char.level, char.background, char.player_name, char.race, char.alignment, char.xp, char.inspiration, char.proficiency_bonus,
        char.strength, char.dexterity, char.constitution, char.intelligence, char.wisdom, char.charisma,
        char.max_hp, char.current_hp, char.armor_class, char.initiative, char.speed, char.hit_dice,
        char.death_saves_success, char.death_saves_failure,
        char.equipment, char.personality_traits, char.ideals, char.bonds, char.flaws, char.appearance, char.backstory,
        id
      ]
    );
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
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Errore eliminazione:", err);
    res.status(500).send("Errore eliminazione personaggio");
  }
});

// GET: Creazione randomica completa
app.get("/characters/random", (req, res) => {
  function rollStat() {
    let rolls = Array.from({length:4}, () => Math.floor(Math.random()*6)+1);
    rolls.sort((a,b)=>a-b);
    return rolls.slice(1).reduce((a,b)=>a+b,0);
  }

  const races = ["Umano","Elfo","Nano","Halfling","Tiefling","Mezzorco"];
  const classes = ["Guerriero","Mago","Ladro","Chierico","Bardo","Paladino"];
  const alignments = ["LB","NB","CB","LN","NN","CN","LM","NM","CM"];

  const randomChar = {
    name: "PG " + Math.floor(Math.random()*1000),
    race: races[Math.floor(Math.random()*races.length)],
    class: classes[Math.floor(Math.random()*classes.length)],
    alignment: alignments[Math.floor(Math.random()*alignments.length)],
    level: 1,
    xp: 0,
    inspiration: false,
    proficiency_bonus: 2,
    strength: rollStat(),
    dexterity: rollStat(),
    constitution: rollStat(),
    intelligence: rollStat(),
    wisdom: rollStat(),
    charisma: rollStat(),
    max_hp: 10 + Math.floor(Math.random()*5),
    current_hp: 10 + Math.floor(Math.random()*5),
    armor_class: 10 + Math.floor(Math.random()*4),
    initiative: Math.floor(Math.random()*5),
    speed: 30,
    hit_dice: "1d10",
    death_saves_success: 0,
    death_saves_failure: 0,
    equipment: "",
    personality_traits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    appearance: "",
    backstory: ""
  };

  res.json(randomChar);
});

// --- Avvio server ---
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http
