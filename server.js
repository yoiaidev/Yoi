const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

app.use(express.json());

// In-memory data stores for demo purposes
const users = {
  // pin: { pin, role, punches: [], tasks: [], completedTraining: [] }
  '1234': {
    pin: '1234',
    role: 'employee',
    punches: [],
    tasks: [],
    completedTraining: []
  },
  '9999': {
    pin: '9999',
    role: 'hr',
    punches: [],
    tasks: [],
    completedTraining: []
  }
};

const ptoRequests = [];
const trainingModules = [
  { id: 1, name: 'Safety Training' },
  { id: 2, name: 'Customer Service Basics' }
];

// Simple authentication middleware
function auth(req, res, next) {
  const token = req.header('Authorization');
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const pin = token.slice('Bearer '.length);
  const user = users[pin];
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.user = user;
  next();
}

function requireHr(req, res, next) {
  if (req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || !users[pin]) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  // Token is just the PIN in this demo
  res.json({ token: pin, user: { pin, role: users[pin].role } });
});

app.get('/api/timeclock', auth, (req, res) => {
  res.json(req.user.punches);
});

app.post('/api/timeclock/punch', auth, (req, res) => {
  const punches = req.user.punches;
  const last = punches[punches.length - 1];
  const nextType = last && last.type === 'in' ? 'out' : 'in';
  const punch = { id: Date.now(), time: new Date().toISOString(), type: nextType };
  punches.push(punch);
  res.json(punch);
});

app.post('/api/pto', auth, (req, res) => {
  const { start, end } = req.body;
  const request = {
    id: Date.now(),
    pin: req.user.pin,
    start,
    end,
    status: 'pending'
  };
  ptoRequests.push(request);
  res.json(request);
});

app.get('/api/pto', auth, (req, res) => {
  const myRequests = ptoRequests.filter(r => r.pin === req.user.pin);
  res.json(myRequests);
});

// Employee task management
app.get('/api/tasks', auth, (req, res) => {
  res.json(req.user.tasks);
});

app.post('/api/tasks', auth, (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task required' });
  const entry = { id: Date.now(), task, time: new Date().toISOString() };
  req.user.tasks.push(entry);
  res.json(entry);
});

// Training modules
app.get('/api/training', auth, (req, res) => {
  const list = trainingModules.map(m => ({
    ...m,
    completed: req.user.completedTraining.includes(m.id)
  }));
  res.json(list);
});

app.post('/api/training/:id/complete', auth, (req, res) => {
  const id = parseInt(req.params.id);
  if (!trainingModules.find(m => m.id === id)) {
    return res.status(404).json({ error: 'Module not found' });
  }
  if (!req.user.completedTraining.includes(id)) {
    req.user.completedTraining.push(id);
  }
  res.json({ id, completed: true });
});

app.get('/api/manager/punches', auth, requireHr, (req, res) => {
  const all = Object.values(users).flatMap(u =>
    u.punches.map(p => ({ ...p, pin: u.pin }))
  );
  res.json(all);
});

app.get('/api/manager/pto', auth, requireHr, (req, res) => {
  res.json(ptoRequests);
});

app.put('/api/manager/pto/:id', auth, requireHr, (req, res) => {
  const id = parseInt(req.params.id);
  const request = ptoRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.body.status) {
    request.status = req.body.status;
  }
  res.json(request);
});

app.get('/api/manager/tasks', auth, requireHr, (req, res) => {
  const all = Object.values(users).flatMap(u =>
    u.tasks.map(t => ({ ...t, pin: u.pin }))
  );
  res.json(all);
});

app.get('/api/manager/training', auth, requireHr, (req, res) => {
  const all = Object.values(users).map(u => ({
    pin: u.pin,
    completedTraining: u.completedTraining
  }));
  res.json(all);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, users, ptoRequests, trainingModules };
