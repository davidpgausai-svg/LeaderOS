import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

import './db/index.js';

import registerRouter from './auth/register.js';
import loginRouter from './auth/login.js';
import strategiesRouter from './api/strategies.js';
import projectsRouter from './api/projects.js';
import actionsRouter from './api/actions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const publicDir = isProduction ? resolve(__dirname, '../public') : resolve(process.cwd(), 'public');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDir));

app.get('/login', (req, res) => {
  res.sendFile(join(publicDir, 'pages/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(join(publicDir, 'pages/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(join(publicDir, 'pages/dashboard.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.use('/auth/register', registerRouter);
app.use('/auth/login', loginRouter);

app.use('/api/strategies', strategiesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/actions', actionsRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StrategicFlow running at http://0.0.0.0:${PORT}`);
});
