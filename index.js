const express = require('express');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const db = require('./database'); // Importation de la base de données
const app = express();
const path = require('path');
const https = require('https');
const port = 3000;
const fs = require("fs");
const favicon = require('serve-favicon');
const PDFDocument = require('pdfkit-table');
const { title } = require('process');
const { font } = require('pdfkit');


// Middleware pour traiter les données du formulaire POST
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Utiliser EJS comme moteur de templates
app.set('view engine', 'ejs');

app.get('/home', (req, res) => {
  const sql1 = `
    SELECT 
      c.nom AS nom_competence,
      d.nom AS nom_domaine,
      m.nom AS nom_matiere,
      SUM(CASE WHEN sc.niveau_color = 'VERT-FONCE' THEN 1 ELSE 0 END) AS nb_vert_fonce,
      SUM(CASE WHEN sc.niveau_color = 'VERT' THEN 1 ELSE 0 END) AS nb_vert,
      SUM(CASE WHEN sc.niveau_color = 'ORANGE' THEN 1 ELSE 0 END) AS nb_orange,
      SUM(CASE WHEN sc.niveau_color = 'ROUGE' THEN 1 ELSE 0 END) AS nb_rouge,
      SUM(CASE WHEN sc.niveau_color = 'GRIS' THEN 1 ELSE 0 END) AS nb_gris
    FROM student_competence sc
    JOIN competence c ON sc.competence_id = c.id
    JOIN domaine d ON c.domaine_id = d.id
    JOIN matiere m ON d.matiere_id = m.id
    GROUP BY c.nom, d.nom, m.nom
    ORDER BY nb_vert_fonce DESC, nb_vert DESC, nb_orange DESC, nb_rouge DESC, nb_gris DESC;
  `;

  const sql2 = `
    SELECT 
      s.fullname AS fullname,
      s.name AS name,
      SUM(CASE WHEN sc.niveau_color = 'VERT-FONCE' THEN 1 ELSE 0 END) AS nb_vert_fonce,
      SUM(CASE WHEN sc.niveau_color = 'VERT' THEN 1 ELSE 0 END) AS nb_vert,
      SUM(CASE WHEN sc.niveau_color = 'ORANGE' THEN 1 ELSE 0 END) AS nb_orange,
      SUM(CASE WHEN sc.niveau_color = 'ROUGE' THEN 1 ELSE 0 END) AS nb_rouge,
      SUM(CASE WHEN sc.niveau_color = 'GRIS' THEN 1 ELSE 0 END) AS nb_gris
    FROM student_competence sc
    JOIN student s ON sc.student_id = s.id
    GROUP BY s.name
    ORDER BY s.name;
  `;

  db.all(sql1, [], (err, rows1) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(sql2, [], (err2, rows2) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }

      // ✅ On passe les deux résultats à la vue
      res.render('home', { data: rows1, dataEleves: rows2 });
    });
  });
});


// app.get('/home', (req, res) => {
//   // Rendre la vue home sans récupérer de données
//   res.render('home'); // Simplement rendre la page d'accueil
// });

// Route pour la page d'accueil 
app.get('/', (req, res) => {
  // Rendre la vue home sans récupérer de données
  res.render('connexion'); // Simplement rendre la page d'accueil
});

// Route pour afficher la liste des étudiants
app.get('/students', (req, res) => {
  const sql = 'SELECT * FROM student';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('students', { students: rows });
  });
});

// Route pour ajouter un étudiant
app.get('/addstudent', (req, res) => {
  res.render('addstudent'); // Rendre la vue 'addstudent.ejs'
});

// Route pour gérer l'ajout d'un étudiant
app.post('/addstudent', (req, res) => {
  const { name, fullname, classe } = req.body;
  const sql = `INSERT INTO student (name, fullname, classe) VALUES (?, ?, ?)`;

  db.run(sql, [name, fullname, classe], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout de l\'étudiant');
    }
    res.redirect('/students'); // Redirige vers la liste des étudiants
  });
});

// Route pour ajouter une matière
app.get('/addmatiere', (req, res) => {
  res.render('addmatiere'); // Affiche le formulaire pour ajouter une matière
});

app.post('/addmatiere', (req, res) => {
  const { nom } = req.body;
  const sql = `INSERT INTO matiere (nom) VALUES (?)`;

  db.run(sql, [nom], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout de la matière');
    }
    res.redirect('/matiere'); // Redirige vers la liste des matières
  });
});

// Route pour ajouter une matière
app.get('/addmatiereBR', (req, res) => {
  res.render('addmatiereBR'); // Affiche le formulaire pour ajouter une matière
});

app.post('/addmatiereBR', (req, res) => {
  const { nom } = req.body;
  const sql = `INSERT INTO matiereBR (nom) VALUES (?)`;

  db.run(sql, [nom], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout de la matière');
    }
    res.redirect('/matiereBR'); // Redirige vers la liste des matières
  });
});

// Route pour afficher la liste des matières
app.get('/matiere', (req, res) => {
  const sql = 'SELECT * FROM matiere';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('matiere', { matieres: rows });
  });
});

// Route pour afficher la liste des matières
app.get('/matiereBR', (req, res) => {
  const sql = 'SELECT * FROM matiereBR';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('matiereBR', { matieres: rows });
  });
});

// Route pour ajouter un domaine
app.get('/adddomaine', (req, res) => {
  // Récupérer les matières pour le formulaire
  db.all('SELECT * FROM matiere', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des matières');
    }
    res.render('adddomaine', { matieres: rows }); // Affiche le formulaire pour ajouter un domaine
  });
});

// Route pour ajouter un domaine
app.get('/adddomaineBR', (req, res) => {
  // Récupérer les matières pour le formulaire
  db.all('SELECT * FROM matiereBR', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des matières');
    }
    res.render('adddomaineBR', { matieres: rows }); // Affiche le formulaire pour ajouter un domaine
  });
});

app.post('/adddomaine', (req, res) => {
  const { nom, matiere_id } = req.body;
  const sql = `INSERT INTO domaine (nom, matiere_id) VALUES (?, ?)`;

  db.run(sql, [nom, matiere_id], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout du domaine');
    }
    res.redirect('/domaine'); // Redirige vers la liste des domaines
  });
});

app.post('/adddomaineBR', (req, res) => {
  const { nom, matiere_id } = req.body;
  const sql = `INSERT INTO domaineBR (nom, matiereBR_id) VALUES (?, ?)`;

  db.run(sql, [nom, matiere_id], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout du domaine');
    }
    res.redirect('/domaineBR'); // Redirige vers la liste des domaines
  });
});

// Route pour afficher la liste des domaines
app.get('/domaine', (req, res) => {
  const sql = `
    SELECT domaine.*, matiere.nom AS matiere_nom 
    FROM domaine 
    JOIN matiere ON domaine.matiere_id = matiere.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('domaine', { domaines: rows });
  });
});

// Route pour afficher la liste des domaines
app.get('/domaineBR', (req, res) => {
  const sql = `
    SELECT domaineBR.*, matiereBR.nom AS matiere_nom 
    FROM domaineBR 
    JOIN matiereBR ON domaineBR.matiereBR_id = matiereBR.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('domaineBR', { domaines: rows });
  });
});

// Route pour ajouter une compétence
app.get('/addcompetence', (req, res) => {
  // Récupérer les domaines pour le formulaire
  db.all('SELECT * FROM domaine', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des domaines');
    }
    res.render('addcompetence', { domaines: rows }); // Affiche le formulaire pour ajouter une compétence
  });
});

// Route pour ajouter une compétence
app.get('/addcompetenceBR', (req, res) => {
  // Récupérer les domaines pour le formulaire
  db.all('SELECT * FROM domaineBR', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des domaines');
    }
    res.render('addcompetenceBR', { domaines: rows }); // Affiche le formulaire pour ajouter une compétence
  });
});

app.post('/addcompetence', (req, res) => {
  const { nom, domaine_id } = req.body;
  const sql = `INSERT INTO competence (nom, domaine_id) VALUES (?, ?)`;

  db.run(sql, [nom, domaine_id], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout de la compétence');
    }
    res.redirect('/competence'); // Redirige vers la liste des compétences
  });
});

app.post('/addcompetenceBR', (req, res) => {
  const { nom, domaine_id } = req.body;
  const sql = `INSERT INTO competenceBR (nom, domaineBR_id) VALUES (?, ?)`;

  db.run(sql, [nom, domaine_id], (err) => {
    if (err) {
      return res.status(500).send('Erreur lors de l\'ajout de la compétence');
    }
    res.redirect('/competenceBR'); // Redirige vers la liste des compétences
  });
});

// Route pour afficher la liste des compétences
app.get('/competence', (req, res) => {
  const sql = `
    SELECT competence.*, domaine.nom AS domaine_nom 
    FROM competence 
    JOIN domaine ON competence.domaine_id = domaine.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('competence', { competences: rows });
  });
});

// Route pour afficher la liste des compétences
app.get('/competenceBR', (req, res) => {
  const sql = `
    SELECT competenceBR.*, domaineBR.nom AS domaine_nom 
    FROM competenceBR 
    JOIN domaineBR ON competenceBR.domaineBR_id = domaineBR.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('competenceBR', { competences: rows });
  });
});

// Route pour afficher le formulaire d'association des compétences à un étudiant
app.get('/assigncompetences', (req, res) => {
  // Récupérer les étudiants
  const sqlStudents = 'SELECT * FROM student';

  // Récupérer les compétences avec les matières et domaines associés
  const sqlCompetences = `
    SELECT competence.id AS competence_id, competence.nom AS competence_nom, 
           domaine.nom AS domaine_nom, 
           matiere.nom AS matiere_nom
    FROM competence
    LEFT JOIN domaine ON competence.domaine_id = domaine.id
    LEFT JOIN matiere ON domaine.matiere_id = matiere.id
  `;
  
  // Exécuter les deux requêtes
  db.all(sqlStudents, [], (err, students) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des étudiants');
    }
    
    db.all(sqlCompetences, [], (err, competences) => {
      if (err) {
        return res.status(500).send('Erreur lors de la récupération des compétences');
      }

      // Rendre la vue assigncompetences.ejs avec les étudiants et les compétences
      res.render('assigncompetences', { students, competences });
    });
  });
});

// Route pour afficher le formulaire d'association des compétences à un étudiant
app.get('/assigncompetencesBR', (req, res) => {
  // Récupérer les étudiants
  const sqlStudents = 'SELECT * FROM student';

  // Récupérer les compétences avec les matières et domaines associés
  const sqlCompetences = `
    SELECT competenceBR.id AS competence_id, competenceBR.nom AS competence_nom, 
           domaineBR.nom AS domaine_nom, 
           matiereBR.nom AS matiere_nom
    FROM competenceBR
    LEFT JOIN domaineBR ON competenceBR.domaineBR_id = domaineBR.id
    LEFT JOIN matiereBR ON domaineBR.matiereBR_id = matiereBR.id
  `;
  
  // Exécuter les deux requêtes
  db.all(sqlStudents, [], (err, students) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des étudiants');
    }
    
    db.all(sqlCompetences, [], (err, competences) => {
      if (err) {
        return res.status(500).send('Erreur lors de la récupération des compétences');
      }

      // Rendre la vue assigncompetences.ejs avec les étudiants et les compétences
      res.render('assigncompetencesBR', { students, competences });
    });
  });
});

app.post('/assigncompetences', (req, res) => {
  const { student_id, competence_ids, competence_levels } = req.body;

  // Vérifier que des compétences ont été sélectionnées
  if (!competence_ids || !competence_levels || competence_ids.length !== competence_levels.length) {
    return res.status(400).send('Veuillez sélectionner au moins une compétence et un niveau associé.');
  }

  // SQL pour supprimer les compétences existantes pour cet élève et la compétence correspondante
  const deleteSql = `DELETE FROM student_competence WHERE student_id = ? AND competence_id = ?`;

  // SQL pour insérer la nouvelle compétence avec le niveau correspondant
  const insertSql = `INSERT INTO student_competence (student_id, competence_id, niveau_color) VALUES (?, ?, ?)`;

  // Utiliser une transaction pour garantir la cohérence des données
  db.serialize(() => {
    for (let i = 0; i < competence_ids.length; i++) {
      const competence_id = competence_ids[i];
      const niveau_color = competence_levels[i];

      // Étape 1 : Supprimer l'enregistrement existant pour cette compétence et cet élève
      db.run(deleteSql, [student_id, competence_id], (err) => {
        if (err) {
          return res.status(500).send('Erreur lors de la suppression des compétences existantes');
        }

        // Étape 2 : Insérer la nouvelle compétence
        db.run(insertSql, [student_id, competence_id, niveau_color], (err) => {
          if (err) {
            return res.status(500).send('Erreur lors de l\'assignation des compétences');
          }
        });
      });
    }
  });

  // Une fois toutes les opérations terminées, rediriger vers la liste des étudiants
  res.redirect('/students');
});

app.post('/assigncompetencesBR', (req, res) => {
  const { student_id, competence_ids, competence_levels } = req.body;

  // Vérifier que des compétences ont été sélectionnées
  if (!competence_ids || !competence_levels || competence_ids.length !== competence_levels.length) {
    return res.status(400).send('Veuillez sélectionner au moins une compétence et un niveau associé.');
  }

  // SQL pour supprimer les compétences existantes pour cet élève et la compétence correspondante
  const deleteSql = `DELETE FROM student_competenceBR WHERE student_id = ? AND competence_id = ?`;

  // SQL pour insérer la nouvelle compétence avec le niveau correspondant
  const insertSql = `INSERT INTO student_competenceBR (student_id, competence_id, niveau_color) VALUES (?, ?, ?)`;

  // Utiliser une transaction pour garantir la cohérence des données
  db.serialize(() => {
    for (let i = 0; i < competence_ids.length; i++) {
      const competence_id = competence_ids[i];
      const niveau_color = competence_levels[i];

      // Étape 1 : Supprimer l'enregistrement existant pour cette compétence et cet élève
      db.run(deleteSql, [student_id, competence_id], (err) => {
        if (err) {
          return res.status(500).send('Erreur lors de la suppression des compétences existantes');
        }

        // Étape 2 : Insérer la nouvelle compétence
        db.run(insertSql, [student_id, competence_id, niveau_color], (err) => {
          if (err) {
            return res.status(500).send('Erreur lors de l\'assignation des compétences');
          }
        });
      });
    }
  });

  // Une fois toutes les opérations terminées, rediriger vers la liste des étudiants
  res.redirect('/students');
});

app.post('/deletestudent/:id', (req, res) => {
  const studentId = req.params.id;
  
  const sql = `DELETE FROM student WHERE id = ?`;
  
  db.run(sql, studentId, function(err) {
      if (err) {
          console.error('Erreur lors de la suppression de l\'étudiant:', err);
          return res.status(500).send('Erreur lors de la suppression.');
      }
      res.redirect('/students'); // Rediriger vers la liste des étudiants après suppression
  });
});

app.post('/deletematiere/:id', (req, res) => {
  const matiereId = req.params.id;

  // Suppression en cascade grâce à la contrainte ON DELETE CASCADE
  const sql = `DELETE FROM matiere WHERE id = ?`;

  db.run(sql, matiereId, function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de la matière:', err);
      return res.status(500).send('Erreur lors de la suppression.');
    }
    res.redirect('/matiere'); // Rediriger vers la liste des matières après suppression
  });
});

app.post('/deletematiereBR/:id', (req, res) => {
  const matiereId = req.params.id;

  // Suppression en cascade grâce à la contrainte ON DELETE CASCADE
  const sql = `DELETE FROM matiereBR WHERE id = ?`;

  db.run(sql, matiereId, function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de la matière:', err);
      return res.status(500).send('Erreur lors de la suppression.');
    }
    res.redirect('/matiereBR'); // Rediriger vers la liste des matières après suppression
  });
});


app.post('/deletedomaine/:id', (req, res) => {
  const domaineId = req.params.id;

  const sql = `DELETE FROM domaine WHERE id = ?`;

  db.run(sql, domaineId, function(err) {
    if (err) {
      console.error('Erreur lors de la suppression du domaine:', err);
      return res.status(500).send('Erreur lors de la suppression.');
    }
    res.redirect('/domaine'); // Rediriger vers la liste des domaines après suppression
  });
});

app.post('/deletedomaineBR/:id', (req, res) => {
  const domaineId = req.params.id;

  const sql = `DELETE FROM domaineBR WHERE id = ?`;

  db.run(sql, domaineId, function(err) {
    if (err) {
      console.error('Erreur lors de la suppression du domaine:', err);
      return res.status(500).send('Erreur lors de la suppression.');
    }
    res.redirect('/domaineBR'); // Rediriger vers la liste des domaines après suppression
  });
});

app.post('/deletecompetence/:id', (req, res) => {
  const competenceId = req.params.id;

  const sql = `DELETE FROM competence WHERE id = ?`;

  db.run(sql, competenceId, function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de la compétence:', err);
      return res.status(500).send('Erreur lors de la suppression.');
    }
    res.redirect('/competence'); // Rediriger vers la liste des compétences après suppression
  });
});

app.post('/deletecompetenceBR/:id', (req, res) => {
  const competenceId = req.params.id;

  const sql = `DELETE FROM competenceBR WHERE id = ?`;

  db.run(sql, competenceId, function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de la compétence:', err);
      return res.status(500).send('Erreur lors de la suppression.');
    }
    res.redirect('/competenceBR'); // Rediriger vers la liste des compétences après suppression
  });
});

// Route pour afficher les notes par élève
app.get('/notespareleve', (req, res) => {
  // Récupérer la liste des étudiants
  const sqlStudents = 'SELECT * FROM student';
  
  db.all(sqlStudents, [], (err, students) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des étudiants');
    }

    // Si aucun étudiant n'est sélectionné au départ, on affiche uniquement la liste déroulante
    res.render('notespareleve', { students, selectedStudent: null, competences: [] });
  });
});

// Route pour afficher les notes par élève
app.get('/notespareleveBR', (req, res) => {
  // Récupérer la liste des étudiants
  const sqlStudents = 'SELECT * FROM student';
  
  db.all(sqlStudents, [], (err, students) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des étudiants');
    }

    // Si aucun étudiant n'est sélectionné au départ, on affiche uniquement la liste déroulante
    res.render('notespareleveBR', { students, selectedStudent: null, competences: [] });
  });
});

// Route pour récupérer les compétences d'un élève
app.post('/getCompetencesByStudent', (req, res) => {
  const studentId = req.body.student_id;

  // Requête pour récupérer les compétences, domaines et matières de l'élève
  const sql = `
    SELECT 
      matiere.nom AS matiere, 
      domaine.nom AS domaine, 
      competence.nom AS competence, 
      student_competence.niveau_color 
    FROM 
      student_competence
    JOIN 
      competence ON student_competence.competence_id = competence.id
    JOIN 
      domaine ON competence.domaine_id = domaine.id
    JOIN 
      matiere ON domaine.matiere_id = matiere.id
    WHERE 
      student_competence.student_id = ?
  `;

  db.all(sql, [studentId], (err, competences) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des compétences');
    }

    // Récupérer la liste des étudiants pour la vue
    const sqlStudents = 'SELECT * FROM student';
    db.all(sqlStudents, [], (err, students) => {
      if (err) {
        return res.status(500).send('Erreur lors de la récupération des étudiants');
      }

      res.render('notespareleve', { students, selectedStudent: studentId, competences });
    });
  });
});

// Route pour récupérer les compétences d'un élève
app.post('/getCompetencesByStudentBR', (req, res) => {
  const studentId = req.body.student_id;

  // Requête pour récupérer les compétences, domaines et matières de l'élève
  const sql = `
    SELECT 
      matiereBR.nom AS matiere, 
      domaineBR.nom AS domaine, 
      competenceBR.nom AS competence, 
      student_competenceBR.niveau_color 
    FROM 
      student_competenceBR
    JOIN 
      competenceBR ON student_competenceBR.competence_id = competenceBR.id
    JOIN 
      domaineBR ON competenceBR.domaineBR_id = domaineBR.id
    JOIN 
      matiereBR ON domaineBR.matiereBR_id = matiereBR.id
    WHERE 
      student_competenceBR.student_id = ?
  `;

  db.all(sql, [studentId], (err, competences) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des compétences');
    }

    // Récupérer la liste des étudiants pour la vue
    const sqlStudents = 'SELECT * FROM student';
    db.all(sqlStudents, [], (err, students) => {
      if (err) {
        return res.status(500).send('Erreur lors de la récupération des étudiants');
      }

      res.render('notespareleveBR', { students, selectedStudent: studentId, competences });
    });
  });
});

async function genererRadarChart(competences) {
  const scoreMap = {
    "VERT-FONCE": 100,
    "VERT": 75,
    "ORANGE": 50,
    "ROUGE": 25,
    "GRIS": 0
  };

  // Calcul des moyennes par matière
  const scoresParMatiere = {};
  competences.forEach(row => {
    const matiere = row.matiere;
    const score = scoreMap[row.niveau_color?.toUpperCase()] ?? 0;
    if (!scoresParMatiere[matiere]) {
      scoresParMatiere[matiere] = { total: 0, count: 0 };
    }
    scoresParMatiere[matiere].total += score;
    scoresParMatiere[matiere].count += 1;
  });

  const labels = Object.keys(scoresParMatiere);
  const moyennes = labels.map(m => scoresParMatiere[m].total / scoresParMatiere[m].count);

  // Génération du canvas
  const chartCanvas = new ChartJSNodeCanvas({ width: 1000, height: 1000, backgroundColour: '#ffffff' });

  const config = {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Scores moyens',
        data: moyennes,
        backgroundColor: 'rgba(202, 255, 118, 0.15)',
        borderColor: '#CAFF76',
        borderWidth: 4,
        pointBackgroundColor: '#CAFF76',
        pointBorderColor: '#60872D',
        pointBorderWidth: 3,
        pointRadius: 8,
      }]
    },
    options: {
      responsive: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            color: 'rgba(0,0,0,0.5)',        // ← noir sur blanc
            backdropColor: 'transparent',
            font: { size: 20 }  // ← noir sur blanc
          },
          grid: { color: 'rgba(0,0,0,0.5)', circular: true },
          angleLines: { color: 'rgba(0,0,0,0.5)' },
          pointLabels: { color: 'rgba(0,0,0)', font: { size: 28, weight: 'bold' } }  // ← noir
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  };

  return await chartCanvas.renderToBuffer(config); // retourne un Buffer PNG
}


app.post('/exportPdf', async (req, res) => {
  const studentId = req.body.student_id;

  try {
    // 1️ Récupération des infos de l'élève
    const sqlStudent = `SELECT name, fullname FROM student WHERE id = ?`;
    const studentInfo = await new Promise((resolve, reject) => {
      db.get(sqlStudent, [studentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 2️ Récupération des compétences
    const sqlCompetences = `
      SELECT competence.nom AS competence,
             student_competence.niveau_color,
             matiere.nom AS matiere,
             domaine.nom AS domaine
      FROM student_competence
      LEFT JOIN competence ON student_competence.competence_id = competence.id
      LEFT JOIN domaine ON competence.domaine_id = domaine.id
      LEFT JOIN matiere ON domaine.matiere_id = matiere.id
      WHERE student_competence.student_id = ?
      ORDER BY matiere.nom ASC;
    `;

    const competences = await new Promise((resolve, reject) => {
      db.all(sqlCompetences, [studentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 3️ Création du document PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fileName = `${studentInfo.name}-${studentInfo.fullname}-${today}.pdf`.replace(/\s+/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // 4️ Titre et nom de l’élève
    doc.fontSize(16).text(`Bilan du trimestre`, { align: 'center' });
    doc.fontSize(12).text(`${studentInfo.name} ${studentInfo.fullname}`, { align: 'center' });

    // 5️ Regroupement par matière
    const competencesByMatiere = competences.reduce((acc, comp) => {
      if (!acc[comp.matiere]) acc[comp.matiere] = [];
      acc[comp.matiere].push(comp);
      return acc;
    }, {});

    // 6️ Génération des tableaux par matière
    for (const [matiere, comps] of Object.entries(competencesByMatiere)) {
      const table = {
        headers: [
          { label: 'Domaine', property: 'domaine', valign: 'center', headerColor: '#ff29c6' },
          { label: 'Compétence', property: 'competence', valign: 'center', headerColor: '#ff29c6' },
          { label: 'Niveau', property: 'niveau_color', valign: 'center', headerColor: '#ff29c6' },
        ],
        rows: comps.map(comp => [
          comp.domaine,
          comp.competence,
          ''
        ]),
        title: `Matière : ${matiere}`,
      };

      doc.moveDown();

      // 7 Affichage du tableau avec coloration des cellules "Niveau"
      await doc.table(table, {
        width: 500,
        columnsSize: [200, 300, 40],
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          if (indexColumn === 2) { // colonne "Niveau"
            const rawValue = comps[indexRow]?.niveau_color?.toUpperCase(); // on récupère la vraie valeur

            let color = null;
            switch (rawValue) {
              case 'VERT-FONCE':
                color = '#006400';
                break;
              case 'VERT':
                color = '#90EE90';
                break;
              case 'ORANGE':
                color = '#FFA500';
                break;
              case 'ROUGE':
                color = '#FF6347';
                break;
              case 'GRIS':
                color = '#D3D3D3';
                break;
            }

            if (color) {
              doc.addBackground(rectCell, color, 0.5);
            }
          }
        }
      });
    }

    // 9️ Génération et ajout du radar chart
    const radarBuffer = await genererRadarChart(competences);

    doc.moveDown(0.5);
    doc.fontSize(12).text('Niveau global de l\'élève (sur 100):', { align: 'left' });
    doc.moveDown(0.3);

    // Centrer l'image sur la page
    const imageX = doc.page.width / 2 - 125; // 250 (largeur de l'image) / 2
    doc.image(radarBuffer, imageX, doc.y, { width: 250, height: 250 });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de l\'exportation en PDF');
  }
});


app.post('/exportPdfBR', async (req, res) => {
  const studentId = req.body.student_id;

  try {
    // 1️ Récupération des infos de l'élève
    const sqlStudent = `SELECT name, fullname FROM student WHERE id = ?`;
    const studentInfo = await new Promise((resolve, reject) => {
      db.get(sqlStudent, [studentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 2️ Récupération des compétences
    const sqlCompetences = `
      SELECT competenceBR.nom AS competence,
             student_competenceBR.niveau_color,
             matiereBR.nom AS matiere,
             domaineBR.nom AS domaine
      FROM student_competenceBR
      LEFT JOIN competenceBR ON student_competenceBR.competence_id = competenceBR.id
      LEFT JOIN domaineBR ON competenceBR.domaineBR_id = domaineBR.id
      LEFT JOIN matiereBR ON domaineBR.matiereBR_id = matiereBR.id
      WHERE student_competenceBR.student_id = ?
      ORDER BY matiereBR.nom ASC;
    `;

    const competences = await new Promise((resolve, reject) => {
      db.all(sqlCompetences, [studentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 3️ Création du document PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fileName = `${studentInfo.name}-${studentInfo.fullname}-${today}.pdf`.replace(/\s+/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // 4️ Titre et nom de l’élève
    doc.fontSize(16).text(`Bilan du trimestre`, { align: 'center' });
    doc.fontSize(12).text(`${studentInfo.name} ${studentInfo.fullname}`, { align: 'center' });

    // 5️ Regroupement par matière
    const competencesByMatiere = competences.reduce((acc, comp) => {
      if (!acc[comp.matiere]) acc[comp.matiere] = [];
      acc[comp.matiere].push(comp);
      return acc;
    }, {});

    // 6️ Génération des tableaux par matière
    for (const [matiere, comps] of Object.entries(competencesByMatiere)) {
      const table = {
        headers: [
          { label: 'Domaine', property: 'domaine', valign: 'center', headerColor: '#ff29c6' },
          { label: 'Compétence', property: 'competence', valign: 'center', headerColor: '#ff29c6' },
          { label: 'Niveau', property: 'niveau_color', valign: 'center', headerColor: '#ff29c6' },
        ],
        rows: comps.map(comp => [
          comp.domaine,
          comp.competence,
          ''
        ]),
        title: `Matière : ${matiere}`,
      };

      doc.moveDown();

      // 7 Affichage du tableau avec coloration des cellules "Niveau"
      await doc.table(table, {
        width: 500,
        columnsSize: [200, 300, 40],
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          if (indexColumn === 2) { // colonne "Niveau"
            const rawValue = comps[indexRow]?.niveau_color?.toUpperCase(); // on récupère la vraie valeur

            let color = null;
            switch (rawValue) {
              case 'VERT-FONCE':
                color = '#006400';
                break;
              case 'VERT':
                color = '#90EE90';
                break;
              case 'ORANGE':
                color = '#FFA500';
                break;
              case 'ROUGE':
                color = '#FF6347';
                break;
              case 'GRIS':
                color = '#D3D3D3';
                break;
            }

            if (color) {
              doc.addBackground(rectCell, color, 0.5);
            }
          }
        }
      });
    }

    doc.end(); // 8 Clôture du document

  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de l\'exportation en PDF');
  }
});

// Fonction pour obtenir la couleur du niveau
function getLevelColor(niveau) {
  const colors = {
    'Excellent': 'green',
    'Bon': 'blue',
    'Moyen': 'yellow',
    'Insuffisant': 'red',
  };
  return colors[niveau] || 'black'; // Couleur par défaut
}

app.get("/api/notes/:studentSelected", (req, res) => {
  const studentSelected = req.params.studentSelected; // ex: "Dupont Alice"

  const sql = `
    SELECT 
      m.nom   AS matiere,
      d.nom   AS domaine,
      c.nom   AS competence,
      sc.niveau_color AS note
    FROM student_competence sc
    JOIN competence c ON sc.competence_id = c.id
    JOIN domaine d ON c.domaine_id = d.id
    JOIN matiere m ON d.matiere_id = m.id
    JOIN student s ON sc.student_id = s.id
    WHERE (s.fullname || ' ' || s.name) = ?
  `;

  db.all(sql, [studentSelected], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows); // renvoie la liste des notes pour l'élève sélectionné
  });
});


// Démarrer le serveur HTTPS
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.cert'))
};

https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('Server is running on https://localhost:3000');
});