const express = require('express');
const db = require('./database'); // Importation de la base de données
const app = express();
const path = require('path');
const https = require('https');
const port = 3000;
const fs = require("fs");
const favicon = require('serve-favicon');
const PDFDocument = require('pdfkit-table');
const { title } = require('process');

// Middleware pour traiter les données du formulaire POST
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Utiliser EJS comme moteur de templates
app.set('view engine', 'ejs');

// Route pour la page d'accueil 
app.get('/', (req, res) => {
  // Rendre la vue home sans récupérer de données
  res.render('home'); // Simplement rendre la page d'accueil
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

app.post('/exportPdf', async (req, res) => {
  const studentId = req.body.student_id;

  try {
    // Étape 1: Récupérer les informations de l'élève
    const sqlStudent = `SELECT name, fullname FROM student WHERE id = ?`;
    const studentInfo = await new Promise((resolve, reject) => {
      db.get(sqlStudent, [studentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Étape 2: Récupérer les compétences
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
      ORDER BY matiere.nom ASC;  // Tri par matière alphabétique
    `;

    const competences = await new Promise((resolve, reject) => {
      db.all(sqlCompetences, [studentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Étape 3: Création du PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Configuration des en-têtes de réponse pour indiquer que c'est un PDF
    res.setHeader('Content-Disposition', 'attachment; filename=document.pdf');
    res.setHeader('Content-Type', 'application/pdf');

    // Pipeliner le document PDF dans la réponse HTTP
    doc.pipe(res);

    // Étape 4: Ajouter le nom et le prénom de l'étudiant en haut du document
    doc.fontSize(16).text(`Bilan du trimestre`, { align: 'center' });
    doc.fontSize(12).text(`${studentInfo.name} ${studentInfo.fullname}`, { align: 'center' });

    // Étape 5: Grouper les compétences par matière
    const competencesByMatiere = competences.reduce((acc, comp) => {
      if (!acc[comp.matiere]) {
        acc[comp.matiere] = [];
      }
      acc[comp.matiere].push(comp);
      return acc;
    }, {});

    // Étape 6: Générer un tableau pour chaque matière
    for (const [matiere, comps] of Object.entries(competencesByMatiere)) {
      // Préparer les données du tableau pour chaque matière
      const table = {
        headers: [
          { label: 'Domaine', property: 'domaine', valign: 'center', headerColor: '#ff29c6' },
          { label: 'Compétence', property: 'competence', valign: 'center', headerColor: '#ff29c6' },
          { label: 'Niveau', property: 'niveau_color', valign: 'center', headerColor: '#ff29c6' },
        ],
        rows: comps.map(comp => [
          comp.domaine,
          comp.competence,
          comp.niveau_color
        ]),
        title: `Matière : ${matiere}`,
      };

      // Ajouter un espace entre les tableaux
      doc.moveDown();

      // Ajouter le tableau pour la matière au document
      await doc.table(table, { width: 500 });
    }

    // Terminer le document après avoir ajouté tous les contenus
    doc.end(); // Assurez-vous que cela se trouve ici

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

// Démarrer le serveur HTTPS
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.cert'))
};

https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('Server is running on https://localhost:3000');
});

