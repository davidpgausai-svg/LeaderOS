import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { withAuth } from '../auth/withAuth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { project_id } = req.query;
  
  let actions;
  if (project_id) {
    actions = db.prepare('SELECT * FROM actions WHERE project_id = ? ORDER BY createdAt DESC').all(project_id);
  } else {
    actions = db.prepare('SELECT * FROM actions ORDER BY createdAt DESC').all();
  }
  res.json(actions);
});

router.get('/:id', (req: Request, res: Response) => {
  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
  if (!action) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }
  res.json(action);
});

router.post('/', withAuth, (req: Request, res: Response) => {
  const { project_id, description, status } = req.body;

  if (!project_id || !description) {
    res.status(400).json({ error: 'project_id and description are required' });
    return;
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
  if (!project) {
    res.status(400).json({ error: 'Project not found' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO actions (id, project_id, description, status) VALUES (?, ?, ?, ?)').run(
    id,
    project_id,
    description,
    status || 'pending'
  );

  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
  res.status(201).json(action);
});

router.put('/:id', withAuth, (req: Request, res: Response) => {
  const { description, status } = req.body;

  const existing = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }

  db.prepare('UPDATE actions SET description = ?, status = ? WHERE id = ?').run(
    description || (existing as any).description,
    status || (existing as any).status,
    req.params.id
  );

  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
  res.json(action);
});

router.delete('/:id', withAuth, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }

  db.prepare('DELETE FROM actions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Action deleted' });
});

export default router;
