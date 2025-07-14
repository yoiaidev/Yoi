const request = require('supertest');
const { app, users, ptoRequests, trainingModules } = require('./server');

describe('API', () => {
  beforeEach(() => {
    users['1234'].punches = [];
    users['1234'].tasks = [];
    users['1234'].completedTraining = [];
    ptoRequests.length = 0;
  });

  test('login success', async () => {
    const res = await request(app).post('/api/auth/login').send({ pin: '1234' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: '1234', user: { pin: '1234', role: 'employee' } });
  });

  test('login failure', async () => {
    const res = await request(app).post('/api/auth/login').send({ pin: '0000' });
    expect(res.status).toBe(401);
  });

  test('punch and list punches', async () => {
    const token = '1234';
    const first = await request(app)
      .post('/api/timeclock/punch')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(first.status).toBe(200);
    expect(first.body.type).toBe('in');

    const second = await request(app)
      .post('/api/timeclock/punch')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(second.status).toBe(200);
    expect(second.body.type).toBe('out');

    const res = await request(app)
      .get('/api/timeclock')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].type).toBe('in');
    expect(res.body[1].type).toBe('out');
  });

  test('request PTO and view', async () => {
    const token = '1234';
    const resReq = await request(app)
      .post('/api/pto')
      .set('Authorization', `Bearer ${token}`)
      .send({ start: '2025-07-20', end: '2025-07-21' });
    expect(resReq.status).toBe(200);
    const resList = await request(app)
      .get('/api/pto')
      .set('Authorization', `Bearer ${token}`);
    expect(resList.status).toBe(200);
    expect(resList.body.length).toBe(1);
    expect(resList.body[0].status).toBe('pending');
  });

  test('manager can view punches and approve PTO', async () => {
    const empToken = '1234';
    await request(app)
      .post('/api/timeclock/punch')
      .set('Authorization', `Bearer ${empToken}`)
      .send();
    await request(app)
      .post('/api/pto')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ start: '2025-07-22', end: '2025-07-22' });

    const hrToken = '9999';
    const punchRes = await request(app)
      .get('/api/manager/punches')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(punchRes.status).toBe(200);
    expect(punchRes.body.length).toBe(1);

    const ptoRes = await request(app)
      .get('/api/manager/pto')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(ptoRes.status).toBe(200);
    expect(ptoRes.body.length).toBe(1);

    const approveRes = await request(app)
      .put(`/api/manager/pto/${ptoRes.body[0].id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'approved' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');
  });

  test('employee tasks and training, manager views', async () => {
    const token = '1234';
    // add task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ task: 'Inventory' });
    expect(taskRes.status).toBe(200);

    // complete training
    const trainingId = trainingModules[0].id;
    const compRes = await request(app)
      .post(`/api/training/${trainingId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(compRes.status).toBe(200);

    const hrToken = '9999';
    const tasks = await request(app)
      .get('/api/manager/tasks')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(tasks.status).toBe(200);
    expect(tasks.body.length).toBe(1);

    const training = await request(app)
      .get('/api/manager/training')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(training.status).toBe(200);
    expect(training.body[0].completedTraining.includes(trainingId)).toBe(true);
  });
});
