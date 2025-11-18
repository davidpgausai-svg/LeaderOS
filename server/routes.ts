import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStrategySchema, insertTacticSchema, insertOutcomeSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);

  // Initialize database with seed data on first run
  if (storage && 'seedData' in storage) {
    await (storage as any).seedData();
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Strategy routes
  app.get("/api/strategies", async (req, res) => {
    try {
      const strategies = await storage.getAllStrategies();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strategies" });
    }
  });

  app.get("/api/strategies/:id", async (req, res) => {
    try {
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strategy" });
    }
  });

  app.post("/api/strategies", async (req, res) => {
    try {
      const validatedData = insertStrategySchema.parse(req.body);
      const strategy = await storage.createStrategy(validatedData);
      res.status(201).json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create strategy" });
    }
  });

  app.patch("/api/strategies/:id", async (req, res) => {
    try {
      const validatedData = insertStrategySchema.parse(req.body);
      const strategy = await storage.updateStrategy(req.params.id, validatedData);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Strategy update error:", error);
      res.status(500).json({ message: "Failed to update strategy" });
    }
  });

  // Bulk reorder strategies endpoint
  app.post("/api/strategies/reorder", async (req, res) => {
    try {
      const { strategyOrders } = req.body;
      if (!Array.isArray(strategyOrders)) {
        return res.status(400).json({ message: "strategyOrders must be an array" });
      }
      
      for (const { id, displayOrder } of strategyOrders) {
        if (typeof id !== 'string' || typeof displayOrder !== 'number') {
          return res.status(400).json({ message: "Each item must have id (string) and displayOrder (number)" });
        }
        await storage.updateStrategy(id, { displayOrder });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Strategy reorder error:", error);
      res.status(500).json({ message: "Failed to reorder strategies" });
    }
  });

  app.delete("/api/strategies/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStrategy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json({ message: "Strategy deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete strategy" });
    }
  });

  app.delete("/api/strategies/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStrategy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json({ message: "Strategy deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete strategy" });
    }
  });

  // Tactic routes
  app.get("/api/tactics", async (req, res) => {
    try {
      const { strategyId, assignedTo } = req.query;
      let tactics;
      
      if (strategyId) {
        tactics = await storage.getTacticsByStrategy(strategyId as string);
      } else if (assignedTo) {
        tactics = await storage.getTacticsByAssignee(assignedTo as string);
      } else {
        tactics = await storage.getAllTactics();
      }
      
      res.json(tactics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tactics" });
    }
  });

  app.get("/api/tactics/:id", async (req, res) => {
    try {
      const tactic = await storage.getTactic(req.params.id);
      if (!tactic) {
        return res.status(404).json({ message: "Tactic not found" });
      }
      res.json(tactic);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tactic" });
    }
  });

  app.post("/api/tactics", async (req, res) => {
    try {
      const validatedData = insertTacticSchema.parse(req.body);
      const tactic = await storage.createTactic(validatedData);
      res.status(201).json(tactic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tactic" });
    }
  });

  app.patch("/api/tactics/:id", async (req, res) => {
    try {
      const tactic = await storage.updateTactic(req.params.id, req.body);
      if (!tactic) {
        return res.status(404).json({ message: "Tactic not found" });
      }
      res.json(tactic);
    } catch (error) {
      res.status(500).json({ message: "Failed to update tactic" });
    }
  });

  app.delete("/api/tactics/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTactic(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Tactic not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tactic" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    try {
      const { userId } = req.query;
      let activities;
      
      if (userId) {
        activities = await storage.getActivitiesByUser(userId as string);
      } else {
        activities = await storage.getAllActivities();
      }
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Outcomes routes
  app.get("/api/outcomes", async (req, res) => {
    try {
      const outcomes = await storage.getAllOutcomes();
      res.json(outcomes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch outcomes" });
    }
  });

  app.post("/api/outcomes", async (req, res) => {
    try {
      const validatedData = insertOutcomeSchema.parse(req.body);
      const outcome = await storage.createOutcome(validatedData);
      
      await storage.createActivity({
        type: "outcome_created",
        description: `Created outcome: ${outcome.title}`,
        userId: outcome.createdBy,
        strategyId: outcome.strategyId,
        tacticId: outcome.tacticId,
      });
      
      res.status(201).json(outcome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Outcome creation error:", error);
      res.status(500).json({ message: "Failed to create outcome" });
    }
  });

  app.patch("/api/outcomes/:id", async (req, res) => {
    try {
      const validatedData = insertOutcomeSchema.parse(req.body);
      const outcome = await storage.updateOutcome(req.params.id, validatedData);
      if (!outcome) {
        return res.status(404).json({ message: "Outcome not found" });
      }
      
      await storage.createActivity({
        type: "outcome_updated", 
        description: `Updated outcome: ${outcome.title}`,
        userId: outcome.createdBy,
        strategyId: outcome.strategyId,
        tacticId: outcome.tacticId,
      });
      
      res.json(outcome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Outcome validation error:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Outcome update error:", error);
      res.status(500).json({ message: "Failed to update outcome" });
    }
  });

  app.delete("/api/outcomes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteOutcome(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Outcome not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete outcome" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
