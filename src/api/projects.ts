import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { withAuth } from '../auth/withAuth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { strategy_id } = req.query;
  
  let projects;
  if (strategy_id) {
    projects = db.prepare('SELECT * FROM projects WHERE strategy_id = ? ORDER BY createdAt DESC').all(strategy_id);
  } else {
    projects = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
  }
  res.json(projects);
});

router.get('/:id', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

router.post('/', withAuth, (req: Request, res: Response) => {
  const { strategy_id, name, status } = req.body;

  if (!strategy_id || !name) {
    res.status(400).json({ error: 'strategy_id and name are required' });
    return;
  }

  const strategy = db.prepare('SELECT id FROM strategies WHERE id = ?').get(strategy_id);
  if (!strategy) {
    res.status(400).json({ error: 'Strategy not found' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, strategy_id, name, status) VALUES (?, ?, ?, ?)').run(
    id,
    strategy_id,
    name,
    status || 'active'
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

router.put('/:id', withAuth, (req: Request, res: Response) => {
  const { name, status } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  db.prepare('UPDATE projects SET name = ?, status = ? WHERE id = ?').run(
    name || (existing as any).name,
    status || (existing as any).status,
    req.params.id
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

router.delete('/:id', withAuth, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

export default router;
