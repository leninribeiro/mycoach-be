const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');


const app = express();
app.use(cors({
    origin: 'http://localhost:9000',
    credentials: true // se você precisar enviar cookies ou headers de auth
  }));
app.use(bodyParser.json());

const SECRET_KEY = 'mycoach';

// Placeholder data
let trainers = JSON.parse(fs.readFileSync('trainers.json', 'utf-8'));
let students = JSON.parse(fs.readFileSync('students.json', 'utf-8'));
let trainings = JSON.parse(fs.readFileSync('trainings.json', 'utf-8'));
let users = students.concat(trainers);

// Middleware for authenticating JWT and checking user role
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) return res.sendStatus(401);
  
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Middleware to restrict access based on user role
function restrictToTrainers(req, res, next) {
    if (req.user.role !== 'trainer') {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
}

// POST /login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    let user = users.find(t => t.username === username && t.password === password);
    if (user) {
        const userPayload = { name: user.name, role: user.role, id: user.id };
        const accessToken = jwt.sign(userPayload, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ access_token: accessToken });
    }

    return res.status(401).json({ error: 'Wrong username or password' });
});

// POST /trainer
app.post('/trainer', authenticateToken, restrictToTrainers, (req, res) => {
    const { name, date_of_birth, sex, username, password } = req.body;

    if (!name || !date_of_birth || !sex || !username || !password) {
        return res.status(400).json({ error: 'Invalid input data' });
    }
    const id = users.length + 1;
    users.push({ name, date_of_birth, sex, id: id, username, password, students: [], role: 'trainer' });

    return res.status(201).json({ message: "Trainer created successfully", id: id });
});

// GET /trainer/{id}
app.get('/trainer/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const trainer = users.find(t => t.id === parseInt(id));
    if (!trainer || !trainer.role || trainer.role !== 'Treinador') {
        return res.status(404).json({ error: "Trainer not found" });
    }

    // Fetch student and training data for the trainer
    trainer.students = users.filter(s => s.trainer_id === trainer.id);
    trainer.students.forEach(student => {
        student.trainings = trainings.filter(t => t.student_id === student.id);
    });

    return res.json(trainer);
});

// POST /student
app.post('/student', authenticateToken, restrictToTrainers, (req, res) => {
    const { name, date_of_birth, sex, weight, height, username, password } = req.body;

    if (!name || !date_of_birth || !sex || !weight || !height || !username || !password) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    trainer_id = req.user.id; // Get the trainer_id from the authenticated user

    const id = users.length + 1;
    users.push({ name, date_of_birth, sex, weight, height, id: id, trainer_id: trainer_id, username, password, role: 'student' });

    return res.status(201).json({ message: "Student created successfully", id: id });
});

// GET /student/{id}
app.get('/student/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const student = users.find(s => s.id === parseInt(id));

    if (!student) {
        return res.status(404).json({ error: "Student not found" });
    }

    student.trainings = trainings.filter(t => t.student_id === student.id);

    return res.json(student);
});

// POST /{aluno_id}/training
app.post('/:aluno_id/training', authenticateToken, (req, res) => {
    const { aluno_id } = req.params;
    const { day, observations, exercises } = req.body;
    let training = { day, observations, exercises };

    const student = users.find(s => s.id === parseInt(aluno_id));

    if (!student) {
        return res.status(404).json({ error: "Student not found" });
    }

    console.log(training)

    if (!training || !Array.isArray(training.exercises)) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    let exerciseList = []
    training.exercises.forEach(exercise => {
        exerciseList.push(exercise.label)
    })

    training.exercises = exerciseList;
    console.log(exerciseList)

    const trainingId = trainings.length + 1;
    trainings.push({ id: trainingId, student_id: parseInt(aluno_id), ...training, date: new Date().toISOString().split('T')[0] });
    

    return res.json({ message: "Training created successfully", id: trainingId });
});

// GET /trainings/{aluno_id}
app.get('/trainings/:aluno_id', authenticateToken, (req, res) => {
    const { aluno_id } = req.params;
    const studentTrainings = trainings.filter(t => t.student_id === parseInt(aluno_id));

    if (studentTrainings.length === 0) {
        return res.status(404).json({ error: "Trainings not found" });
    }

    return res.json({ trainings: studentTrainings });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});