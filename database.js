const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers le fichier de la base de données
const dbPath = path.resolve(__dirname, 'students.db');

// Connexion à la base de données SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données', err);
  } else {
    console.log('Connecté à la base de données SQLite');
  }
});

// Création des tables
db.serialize(() => {

  db.run('PRAGMA foreign_keys = ON;');

  // Création de la table 'student'
  db.run(`
    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT NOT NULL,
      name TEXT NOT NULL,
      classe TEXT NOT NULL
  )`);

  // Création de la table 'student_competence'
  db.run(`
    CREATE TABLE IF NOT EXISTS student_competence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      competence_id INTEGER,
      niveau_color TEXT,
      FOREIGN KEY (student_id) REFERENCES student (id) ON DELETE CASCADE,
      FOREIGN KEY (competence_id) REFERENCES competence (id) ON DELETE CASCADE
    )`);

  // Création de la table 'matiere'
  db.run(`
    CREATE TABLE IF NOT EXISTS matiere (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL
    )
  `);

  // Création de la table 'domaine'
  db.run(`
    CREATE TABLE IF NOT EXISTS domaine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      matiere_id INTEGER,
      FOREIGN KEY (matiere_id) REFERENCES matiere(id) ON DELETE CASCADE
    )
  `);

  // Création de la table 'competence'
  db.run(`
    CREATE TABLE IF NOT EXISTS competence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      domaine_id INTEGER,
      FOREIGN KEY (domaine_id) REFERENCES domaine(id) ON DELETE CASCADE
    )
  `);

});

module.exports = db;
