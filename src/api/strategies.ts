import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { withAuth } from '../auth/withAuth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const strategies = db.prepare('SELECT * FROM strategies ORDER BY createdAt DESC').all();
  res.json(strategies);
});

router.get('/:id', (req: Request, res: Response) => {
  const strategy = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id);
  if (!strategy) {
    res.status(404).json({ error: 'Strategy not found' });
    return;
  }
  res.json(strategy);
});

router.post('/', withAuth, (req: Request, res: Response) => {
  const { name, description, status } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO strategies (id, name, description, status) VALUES (?, ?, ?, ?)').run(
    id,
    name,
    description || '',
    status || 'active'
  );

  const strategy = db.prepare('SELECT * FROM strategies WHERE id = ?').get(id);
  res.status(201).json(strategy);
});

router.put('/:id', withAuth, (req: Request, res: Response) => {
  const { name, description, status } = req.body;

  const existing = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Strategy not found' });
    return;
  }

  db.prepare('UPDATE strategies SET name = ?, description = ?, status = ? WHERE id = ?').run(
    name || (existing as any).name,
    description !== undefined ? description : (existing as any).description,
    status || (existing as any).status,
    req.params.id
  );

  const strategy = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id);
  res.json(strategy);
});

router.delete('/:id', withAuth, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Strategy not found' });
    return;
  }

  db.prepare('DELETE FROM strategies WHERE id = ?').run(req.params.id);
  res.json({ message: 'Strategy deleted' });
});

export default router;
