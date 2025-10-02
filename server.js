// server.js - completo e robusto per la scheda D&D 5e
const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Utility
const toIntOrNull = v => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
const toBool = v => {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    return (s === "true" || s === "1" || s === "yes" || s === "y");
  }
  return null;
};

// Lista colonne supportate (canonicale)
const COLUMNS = [
  "name","class","race","subrace","background","alignment","player_name","level","xp","inspiration","proficiency_bonus",
  "strength","dexterity","constitution","intelligence","wisdom","charisma",
  "str","dex","con","int","wis","cha",
  "max_hp","current_hp","hp","armor_class","ac","initiative","speed","hit_dice",
  "death_saves_success","death_saves_failure",
  "attacks","spells","spell_slots","equipment","gold",
  "traits","personality_traits","ideals","bonds","flaws","appearance","backstory",
  "data","created_at"
];

// Mappa delle possibili chiavi in ingresso per ogni colonna (alias)
const ALIASES = {
  name: ["name"],
  class: ["class","class_name"],
  race: ["race"],
  subrace: ["subrace"],
  background: ["background"],
  alignment: ["alignment"],
  player_name: ["player_name","player"],
  level: ["level"],
  xp: ["xp","experience"],
  inspiration: ["inspiration"],
  proficiency_bonus: ["proficiency_bonus","prof_bonus"],
  strength: ["strength","str"],
  dexterity: ["dexterity","dex"],
  constitution: ["constitution","con"],
  intelligence: ["intelligence","int"],
  wisdom: ["wisdom","wis"],
  charisma: ["charisma","cha"],
  str: ["str","strength"],
  dex: ["dex","dexterity"],
  con: ["con","constitution"],
  int: ["int","intelligence"],
  wis: ["wis","wisdom"],
  cha: ["cha","charisma"],
  max_hp: ["max_hp","maxhp","hp","hit_points"],
  current_hp: ["current_hp","currenthp","hp","current_hp"],
  hp: ["hp","max_hp","current_hp"],
  armor_class: ["armor_class","ac"],
  ac: ["ac","armor_class"],
  initiative: ["initiative"],
  speed: ["speed"],
  hit_dice: ["hit_dice","hitdice","hit_dice"],
  death_saves_success: ["death_saves_success","death_success"],
  death_saves_failure: ["death_saves_failure","death_failure"],
  attacks: ["attacks","weapons"],
  spells: ["spells","spell_list"],
  spell_slots: ["spell_slots","spellslots"],
  equipment: ["equipment","inventory"],
  gold: ["gold","gp","money"],
  traits: ["traits","personality_traits"],
  personality_traits: ["personality_traits","traits"],
  ideals: ["ideals"],
  bonds: ["bonds"],
  flaws: ["flaws"],
  appearance: ["appearance"],
  backstory: ["backstory","story"],
  data: ["data"]
};

// Restituisce il primo valore definito tra gli alias
function pickValue(body, col) {
  const aliases = ALIASES[col] || [col];
  for (const a of aliases) {
    if (Object.prototype.hasOwnProperty.call(body, a)) return body[a];
  }
  return undefined;
}

// --- Creazione tabella e migrazione sicura ---
(async () => {
  try {
    // Crea tabella base se non esiste
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        name TEXT,
        class TEXT,
        race TEXT,
        subrace TEXT,
        background TEXT,
        alignment TEXT,
        player_name TEXT,
        level INTEGER,
        xp INTEGER,
        inspiration BOOLEAN,
        proficiency_bonus INTEGER,
        strength INTEGER, dexterity INTEGER, constitution INTEGER, intelligence INTEGER, wisdom INTEGER, charisma INTEGER,
        str INTEGER, dex INTEGER, con INTEGER, int INTEGER, wis INTEGER, cha INTEGER,
        max_hp INTEGER, current_hp INTEGER, hp INTEGER, armor_class INTEGER, ac INTEGER, initiative INTEGER, speed INTEGER,
        hit_dice TEXT,
        death_saves_success INTEGER, death_saves_failure INTEGER,
        attacks TEXT, spells TEXT, spell_slots TEXT,
        equipment TEXT, gold INTEGER,
        traits TEXT, personality_traits TEXT, ideals TEXT, bonds TEXT, flaws TEXT, appearance TEXT, backstory TEXT,
        data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log("✅ Tabella 'characters' verificata/creata.");
  } catch (err) {
    console.error("❌ Errore nella creazione tabella characters:", err.message);
  }

  // Assicura tutte le colonne (in più: ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
  try {
    for (const col of COLUMNS) {
      if (col === "created_at") continue; // già gestita
      // genere definizione semplice per tipi noti
      let def = "TEXT";
      if ([
        "level","xp","proficiency_bonus","strength","dexterity","constitution","intelligence","wisdom","charisma",
        "str","dex","con","int","wis","cha",
        "max_hp","current_hp","hp","armor_class","ac","initiative","speed",
        "death_saves_success","death_saves_failure","gold"
      ].includes(col)) def = "INTEGER";
      if (["inspiration"].includes(col)) def = "BOOLEAN";
      if (["hit_dice","attacks","spells","spell_slots","equipment","traits","personality_traits","ideals","bonds","flaws","appearance","backstory","data"].includes(col)) def = "TEXT";
      // data is JSONB but already created
      if (col === "data") continue;

      try {
        await pool.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS ${col} ${def};`);
        //console.log(`✅ Colonna verificata/creata: ${col}`);
      } catch (innerErr) {
        console.warn(`⚠️ Problema creando la colonna ${col}:`, innerErr.message);
      }
    }
    console.log("✅ Migrazione colonne completata.");
  } catch (err) {
    console.error("❌ Errore durante la migrazione delle colonne:", err.message);
  }
})();

// --- ENDPOINTS ---

// GET /characters - lista
app.get("/characters", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM characters ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Errore recupero personaggi:", err.message);
    res.status(500).json({ error: "Errore recupero personaggi" });
  }
});

// GET /characters/random - generatore server-side
app.get("/characters/random", (req, res) => {
  function rollStat() {
    const rolls = Array.from({length:4}, () => Math.floor(Math.random()*6)+1);
    rolls.sort((a,b) => b-a);
    return rolls[0] + rolls[1] + rolls[2];
  }
  const races = ["Umano","Elfo","Nano","Halfling","Tiefling","Dragonide","Mezzorco","Gnomo"];
  const classes = ["Guerriero","Mago","Ladro","Chierico","Barbaro","Bardo","Druido","Paladino","Monaco","Ranger","Stregone","Warlock"];
  const alignments = ["LB","NB","CB","LN","NN","CN","LM","NM","CM"];

  const randomChar = {
    name: "PG" + Math.floor(Math.random()*10000),
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
    str: null, dex: null, con: null, int: null, wis: null, cha: null,
    max_hp: 10 + Math.floor(Math.random()*6),
    current_hp: 10 + Math.floor(Math.random()*6),
    hp: null,
    armor_class: 10 + Math.floor(Math.random()*4),
    ac: null,
    initiative: 0,
    speed: 30,
    hit_dice: "1d8",
    attacks: "",
    spells: "",
    spell_slots: "",
    equipment: "",
    gold: 0,
    traits: "",
    personality_traits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    appearance: "",
    backstory: ""
  };

  res.json(randomChar);
});

// POST /characters - crea nuovo personaggio
app.post("/characters", async (req, res) => {
  const b = req.body || {};
  try {
    // costruisci array di colonne e valori basati su COLUMNS (escludo created_at)
    const cols = [];
    const vals = [];
    for (const col of COLUMNS) {
      if (col === "created_at") continue;
      // prendi il primo alias definito nel body
      const rawVal = pickValue(b, col);
      // converti tipi per alcune colonne
      let v = rawVal;
      if (["level","xp","proficiency_bonus","strength","dexterity","constitution","intelligence","wisdom","charisma","str","dex","con","int","wis","cha","max_hp","current_hp","hp","armor_class","ac","initiative","speed","death_saves_success","death_saves_failure","gold"].includes(col)) {
        v = toIntOrNull(rawVal);
      } else if (["inspiration"].includes(col)) {
        v = toBool(rawVal);
      } else if (col === "data") {
        // salviamo il body intero in data
        v = JSON.stringify(b);
      } else {
        // TEXT columns - assicurati che undefined sia null
        if (v === undefined) v = null;
      }
      cols.push(col);
      vals.push(v);
    }

    // costruisci query parametrizzata
    const placeholders = vals.map((_,i) => `$${i+1}`).join(",");
    const sql = `INSERT INTO characters(${cols.join(",")}) VALUES(${placeholders}) RETURNING *`;
    const result = await pool.query(sql, vals);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Errore creazione personaggio:", err.message, err.stack);
    res.status(500).json({ error: "Errore creazione personaggio" });
  }
});

// PUT /characters/:id - aggiorna personaggio
app.put("/characters/:id", async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  try {
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const col of COLUMNS) {
      if (col === "created_at" || col === "data") continue; // aggiorno data separatamente
      const rawVal = pickValue(b, col);
      if (rawVal === undefined) continue; // non aggiornare se non presente
      let v = rawVal;
      if (["level","xp","proficiency_bonus","strength","dexterity","constitution","intelligence","wisdom","charisma","str","dex","con","int","wis","cha","max_hp","current_hp","hp","armor_class","ac","initiative","speed","death_saves_success","death_saves_failure","gold"].includes(col)) {
        v = toIntOrNull(rawVal);
      } else if (["inspiration"].includes(col)) {
        v = toBool(rawVal);
      } else {
        if (v === undefined) v = null;
      }
      sets.push(`${col} = $${idx}`);
      vals.push(v);
      idx++;
    }

    // aggiorna la colonna data con l'intero body (opzionale)
    vals.push(JSON.stringify(b));
    sets.push(`data = $${idx}`);
    idx++;

    // id param
    vals.push(id);
    const sql = `UPDATE characters SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(sql, vals);
    if (result.rows.length === 0) return res.status(404).json({ error: "Personaggio non trovato" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Errore aggiornamento personaggio:", err.message);
    res.status(500).json({ error: "Errore aggiornamento personaggio" });
  }
});

// DELETE /characters/:id
app.delete("/characters/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM characters WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Errore eliminazione personaggio:", err.message);
    res.status(500).json({ error: "Errore eliminazione personaggio" });
  }
});

// root health check
app.get("/health", (req, res) => res.send({ ok: true }));

// Avvia server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
