const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = 'your-secret-key'; // Secret key for JWT signing

// Placeholder data
let trainers = JSON.parse(fs.readFileSync('trainers.json', 'utf-8'));
let students = JSON.parse(fs.readFileSync('students.json', 'utf-8'));
let trainings = JSON.parse(fs.readFileSync('trainings.json', 'utf-8'));


// Middleware for authenticating JWT
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

// POST /login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Simulate user authentication
    if (username === 'example' && password === 'examplepassword') {
        const user = { name: 'John Doe' }; // Example user
        const accessToken = jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ access_token: accessToken });
    }
    
    return res.status(401).json({ error: 'Wrong username or password' });
});

// POST /trainer
app.post('/trainer', authenticateToken, (req, res) => {
    const { name, date_of_birth, sex } = req.body;

    if (!name || !date_of_birth || !sex) {
        return res.status(400).json({ error: 'Invalid input data' });
    }
    const trainerId = trainers.length + 1;
    trainers.push({ name, date_of_birth, sex, trainer_id: trainerId, students: [] });

    return res.status(201).json({ message: "Trainer created successfully", trainer_id: trainerId });
});

// GET /trainer/{trainer_id}
app.get('/trainer/:trainer_id', authenticateToken, (req, res) => {
    const { trainer_id } = req.params;
    const trainer = trainers.find(t => t.trainer_id === parseInt(trainer_id));

    if (!trainer) {
        return res.status(404).json({ error: "Trainer not found" });
    }

    // Fetch student and training data for the trainer
    trainer.students = students.filter(s => s.trainer_id === trainer.trainer_id);
    trainer.students.forEach(student => {
        student.trainings = trainings.filter(t => t.student_id === student.student_id);
    });

    return res.json(trainer);
});

// POST /student
app.post('/student', authenticateToken, (req, res) => {
    const { name, date_of_birth, sex, weight, height } = req.body;

    if (!name || !date_of_birth || !sex || !weight || !height) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const studentId = students.length + 1;
    students.push({ name, date_of_birth, sex, weight, height, student_id: studentId, trainer_id: 1 });

    return res.status(201).json({ message: "Student created successfully", student_id: studentId });
});

// GET /aluno/{aluno_id}
app.get('/aluno/:aluno_id', authenticateToken, (req, res) => {
    const { aluno_id } = req.params;
    const student = students.find(s => s.student_id === parseInt(aluno_id));

    if (!student) {
        return res.status(404).json({ error: "Student not found" });
    }

    return res.json(student);
});

// POST /{aluno_id}/training
app.post('/:aluno_id/training', authenticateToken, (req, res) => {
    const { aluno_id } = req.params;
    const { training } = req.body;

    const student = students.find(s => s.student_id === parseInt(aluno_id));

    if (!student) {
        return res.status(404).json({ error: "Student not found" });
    }

    if (!training || !Array.isArray(training.exercises)) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const trainingId = trainings.length + 1;
    trainings.push({ training_id: trainingId, student_id: parseInt(aluno_id), ...training, date: new Date().toISOString().split('T')[0] });

    return res.json({ message: "Training created successfully" });
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