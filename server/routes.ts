import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStrategySchema, insertTacticSchema, insertOutcomeSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { logger } from "./logger";

// Validation helpers
function isValidHexColor(color: string): boolean {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
}

function validateDateRange(startDate: Date, endDate: Date): boolean {
  return new Date(startDate) <= new Date(endDate);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);

  // Initialize database with seed data only in development
  if (process.env.NODE_ENV !== 'production' && storage && 'seedData' in storage) {
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
      logger.error("Error fetching authenticated user", error);
      res.status(500).json({ message: "Unable to load user information. Please try refreshing the page." });
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

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      // Check if the requesting user is an administrator
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (!requestingUser || requestingUser.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can add users" });
      }

      const { firstName, lastName, email } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Check if user with this email already exists
      const existingUsers = await storage.getAllUsers();
      if (existingUsers.some((u: any) => u.email === email)) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      // Create user with a placeholder ID that will be updated when they sign in
      const user = await storage.upsertUser({
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        firstName,
        lastName,
        role: "leader", // Default role for new users
      });

      res.status(201).json(user);
    } catch (error) {
      logger.error("User creation failed", error);
      res.status(500).json({ message: "Unable to create user. Please verify all information is correct and try again." });
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
      
      // Validate color code format
      if (validatedData.colorCode && !isValidHexColor(validatedData.colorCode)) {
        return res.status(400).json({ message: "Color code must be a valid hex color (e.g., #FF5733)" });
      }
      
      // Validate date range
      if (validatedData.startDate && validatedData.targetDate && 
          !validateDateRange(validatedData.startDate, validatedData.targetDate)) {
        return res.status(400).json({ message: "Start date must be before or equal to target date" });
      }
      
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
      
      // Validate color code format
      if (validatedData.colorCode && !isValidHexColor(validatedData.colorCode)) {
        return res.status(400).json({ message: "Color code must be a valid hex color (e.g., #FF5733)" });
      }
      
      // Validate date range
      if (validatedData.startDate && validatedData.targetDate && 
          !validateDateRange(validatedData.startDate, validatedData.targetDate)) {
        return res.status(400).json({ message: "Start date must be before or equal to target date" });
      }
      
      const strategy = await storage.updateStrategy(req.params.id, validatedData);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Strategy update failed", error);
      res.status(500).json({ message: "Unable to update framework. Please check your inputs and try again." });
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
      logger.error("Strategy reorder failed", error);
      res.status(500).json({ message: "Unable to reorder frameworks. Please try again." });
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

  app.patch("/api/strategies/:id/complete", async (req, res) => {
    try {
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      // Only update status and completionDate, keep other fields unchanged
      const updatedStrategy = await storage.updateStrategy(req.params.id, {
        ...strategy,
        status: 'Completed',
        completionDate: new Date(),
      });

      res.json(updatedStrategy);
    } catch (error) {
      logger.error("Strategy completion failed", error);
      res.status(500).json({ message: "Unable to mark framework as completed. Please try again." });
    }
  });

  app.patch("/api/strategies/:id/archive", async (req, res) => {
    try {
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      if (strategy.status !== 'Completed') {
        return res.status(400).json({ message: "Only completed strategies can be archived" });
      }

      // Update strategy status to Archived
      await storage.updateStrategy(req.params.id, {
        ...strategy,
        status: 'Archived',
      });

      // Cascade archive to all tactics
      const tactics = await storage.getAllTactics();
      const strategyTactics = tactics.filter((t: any) => t.strategyId === req.params.id);
      for (const tactic of strategyTactics) {
        await storage.updateTactic(tactic.id, { ...tactic, isArchived: 'true' });
      }

      // Cascade archive to all outcomes
      const outcomes = await storage.getAllOutcomes();
      const strategyOutcomes = outcomes.filter((o: any) => o.strategyId === req.params.id);
      for (const outcome of strategyOutcomes) {
        await storage.updateOutcome(outcome.id, { ...outcome, isArchived: 'true' });
      }

      res.json({ message: "Strategy and related items archived successfully" });
    } catch (error) {
      logger.error("Strategy archive failed", error);
      res.status(500).json({ message: "Unable to archive framework. Please ensure it's marked as completed first." });
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
      
      // Validate date range
      if (validatedData.startDate && validatedData.dueDate && 
          !validateDateRange(validatedData.startDate, validatedData.dueDate)) {
        return res.status(400).json({ message: "Start date must be before or equal to due date" });
      }
      
      const tactic = await storage.createTactic(validatedData);

      // Recalculate parent strategy progress when a tactic is created
      await storage.recalculateStrategyProgress(tactic.strategyId);

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

      // Recalculate parent strategy progress when a tactic is updated (non-blocking)
      try {
        await storage.recalculateStrategyProgress(tactic.strategyId);
      } catch (progressError) {
        logger.error("Failed to recalculate strategy progress after tactic update", progressError);
        // Don't fail the request if progress calculation fails
      }

      res.json(tactic);
    } catch (error) {
      logger.error("Tactic update failed", error);
      res.status(500).json({ message: "Failed to update tactic" });
    }
  });

  app.delete("/api/tactics/:id", async (req, res) => {
    try {
      // Get tactic details before deleting to know which strategy to recalculate
      const tactic = await storage.getTactic(req.params.id);
      if (!tactic) {
        return res.status(404).json({ message: "Tactic not found" });
      }

      const deleted = await storage.deleteTactic(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Tactic not found" });
      }

      // Recalculate parent strategy progress when a tactic is deleted
      await storage.recalculateStrategyProgress(tactic.strategyId);

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

      // Recalculate progress: outcome -> tactic -> strategy
      if (outcome.tacticId) {
        await storage.recalculateTacticProgress(outcome.tacticId);
        await storage.recalculateStrategyProgress(outcome.strategyId);
      }
      
      res.status(201).json(outcome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Outcome creation failed", error);
      res.status(500).json({ message: "Unable to create outcome. Please verify all required fields are filled." });
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

      // Recalculate progress: outcome -> tactic -> strategy
      if (outcome.tacticId) {
        await storage.recalculateTacticProgress(outcome.tacticId);
        await storage.recalculateStrategyProgress(outcome.strategyId);
      }
      
      res.json(outcome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Outcome validation error", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Outcome update failed", error);
      res.status(500).json({ message: "Unable to update outcome. Please check your inputs and try again." });
    }
  });

  app.delete("/api/outcomes/:id", async (req, res) => {
    try {
      // Get outcome details before deleting to know which tactic/strategy to recalculate
      const outcome = await storage.getOutcome(req.params.id);
      if (!outcome) {
        return res.status(404).json({ message: "Outcome not found" });
      }

      const deleted = await storage.deleteOutcome(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Outcome not found" });
      }

      // Recalculate progress: outcome -> tactic -> strategy
      if (outcome.tacticId) {
        await storage.recalculateTacticProgress(outcome.tacticId);
        await storage.recalculateStrategyProgress(outcome.strategyId);
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete outcome" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
