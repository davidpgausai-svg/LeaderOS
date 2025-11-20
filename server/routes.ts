import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStrategySchema, insertTacticSchema, insertOutcomeSchema, insertOutcomeDocumentSchema, insertOutcomeChecklistItemSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { logger } from "./logger";
import OpenAI from "openai";
import { notifyActionCompleted, notifyActionAchieved, notifyProjectProgress, notifyProjectStatusChanged, notifyStrategyStatusChanged, notifyReadinessRatingChanged, notifyRiskExposureChanged, notifyMilestoneCompleted } from "./notifications";

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

  // Initialize OpenAI client
  const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });

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
        role: "co_lead", // Default role for new users
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

  // User Strategy Assignment routes
  app.get("/api/users/:userId/strategy-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Only administrators can view other users' assignments
      if (requestingUser?.role !== 'administrator' && requestingUserId !== req.params.userId) {
        return res.status(403).json({ message: "Forbidden: Cannot view other users' assignments" });
      }

      const assignments = await storage.getUserStrategyAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch strategy assignments", error);
      res.status(500).json({ message: "Failed to fetch strategy assignments" });
    }
  });

  app.post("/api/users/:userId/strategy-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Only administrators can assign strategies
      if (requestingUser?.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can assign strategies" });
      }

      const { strategyId } = req.body;
      if (!strategyId) {
        return res.status(400).json({ message: "Strategy ID is required" });
      }

      // Verify strategy exists
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      // Verify user exists
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const assignment = await storage.assignStrategy(req.params.userId, strategyId, requestingUserId);
      res.status(201).json(assignment);
    } catch (error) {
      logger.error("Failed to assign strategy", error);
      res.status(500).json({ message: "Failed to assign strategy" });
    }
  });

  app.delete("/api/users/:userId/strategy-assignments/:strategyId", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Only administrators can unassign strategies
      if (requestingUser?.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can unassign strategies" });
      }

      const success = await storage.unassignStrategy(req.params.userId, req.params.strategyId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.status(204).send();
    } catch (error) {
      logger.error("Failed to unassign strategy", error);
      res.status(500).json({ message: "Failed to unassign strategy" });
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

  app.post("/api/strategies/generate-continuum", isAuthenticated, async (req, res) => {
    try {
      const { title, description, goal } = req.body;
      
      if (!title || !description || !goal) {
        return res.status(400).json({ message: "Title, description, and goal are required" });
      }

      const prompt = `You are a strategic planning expert helping to develop a comprehensive change management framework for an organizational strategy.

Strategy Title: ${title}
Description: ${description}
Goal: ${goal}

Based on this information, generate detailed content for the following 9 Change Continuum fields. Provide practical, actionable, and specific content for each field:

1. Case for Change: Explain why this change is necessary and urgent for the organization
2. Vision Statement: Describe the desired future state after this strategy is successfully implemented
3. Success Metrics: Define specific, measurable indicators that will demonstrate success
4. Stakeholder Map: Identify key stakeholders, their roles, and level of influence/interest
5. Readiness Rating (RAG): Assess organizational readiness using Red/Amber/Green rating with justification
6. Risk Exposure Rating: Identify potential risks and their mitigation strategies
7. Change Champion Assignment: Suggest who should lead this change and why
8. Reinforcement Plan: Describe how the change will be sustained over time
9. Benefits Realization Plan: Outline how benefits will be tracked and realized

Respond ONLY with a valid JSON object in this exact format:
{
  "caseForChange": "...",
  "visionStatement": "...",
  "successMetrics": "...",
  "stakeholderMap": "...",
  "readinessRating": "...",
  "riskExposureRating": "...",
  "changeChampionAssignment": "...",
  "reinforcementPlan": "...",
  "benefitsRealizationPlan": "..."
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a strategic planning and change management expert. Provide detailed, practical guidance for organizational change initiatives. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const generatedFields = JSON.parse(content);
      res.json(generatedFields);
    } catch (error) {
      logger.error("AI generation failed", error);
      res.status(500).json({ message: "Failed to generate Change Continuum fields. Please try again." });
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
      // Get the old strategy to compare changes
      const oldStrategy = await storage.getStrategy(req.params.id);
      
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
      
      // Send notifications for significant changes
      if (oldStrategy) {
        // Get all executives to notify
        const allUsers = await storage.getAllUsers();
        const executiveUserIds = allUsers
          .filter(u => u.role === "executive" || u.role === "administrator")
          .map(u => u.id);
        
        // Notify for status changes
        if (oldStrategy.status !== strategy.status) {
          await notifyStrategyStatusChanged(strategy.id, strategy.title, oldStrategy.status, strategy.status, executiveUserIds);
        }
        
        // Notify for readiness rating changes
        if (oldStrategy.readinessRating !== strategy.readinessRating) {
          await notifyReadinessRatingChanged(strategy.id, strategy.title, oldStrategy.readinessRating, strategy.readinessRating, executiveUserIds);
        }
        
        // Notify for risk exposure changes
        if (oldStrategy.riskExposureRating !== strategy.riskExposureRating) {
          await notifyRiskExposureChanged(strategy.id, strategy.title, oldStrategy.riskExposureRating, strategy.riskExposureRating, executiveUserIds);
        }
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

      // Auto-generate 7 milestones and 7 communication templates for the new tactic
      await storage.createMilestones(tactic.id);
      await storage.createCommunicationTemplates(tactic.id);

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
      // Get the old tactic to compare changes
      const oldTactic = await storage.getTactic(req.params.id);
      
      const tactic = await storage.updateTactic(req.params.id, req.body);
      if (!tactic) {
        return res.status(404).json({ message: "Tactic not found" });
      }

      // Send notifications for progress milestones and status changes
      if (oldTactic) {
        const assignedUserIds = JSON.parse(tactic.accountableLeaders);
        
        // Notify for status changes
        if (oldTactic.status !== tactic.status) {
          await notifyProjectStatusChanged(tactic.id, tactic.title, oldTactic.status, tactic.status, assignedUserIds);
        }
        
        // Notify for progress milestones (25%, 50%, 75%, 100%)
        const oldProgress = oldTactic.progress;
        const newProgress = tactic.progress;
        
        // Check if we crossed a milestone threshold
        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
          if (oldProgress < milestone && newProgress >= milestone) {
            await notifyProjectProgress(tactic.id, tactic.title, milestone, assignedUserIds);
            break; // Only notify for the first milestone crossed
          }
        }
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
      // Get the old outcome to compare status changes
      const oldOutcome = await storage.getOutcome(req.params.id);
      
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

      // Send notifications for status changes
      if (oldOutcome && oldOutcome.status !== "achieved" && outcome.status === "achieved") {
        let assignedUserIds: string[] = [];
        
        // If action is linked to a project, notify project's assigned users
        if (outcome.tacticId) {
          const tactic = await storage.getTactic(outcome.tacticId);
          if (tactic) {
            assignedUserIds = JSON.parse(tactic.accountableLeaders);
          }
        }
        
        // If no project users, notify the creator of the action
        if (assignedUserIds.length === 0) {
          assignedUserIds = [outcome.createdBy];
        }
        
        // Send the notification
        await notifyActionAchieved(outcome.id, outcome.title, assignedUserIds);
      }

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

  // Outcome Document routes
  app.get("/api/outcomes/:outcomeId/documents", async (req, res) => {
    try {
      const documents = await storage.getOutcomeDocuments(req.params.outcomeId);
      res.json(documents);
    } catch (error) {
      logger.error("Failed to fetch outcome documents", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/outcomes/:outcomeId/documents", async (req, res) => {
    try {
      const validatedData = insertOutcomeDocumentSchema.parse({
        ...req.body,
        outcomeId: req.params.outcomeId,
      });
      const document = await storage.createOutcomeDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create outcome document", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch("/api/outcomes/:outcomeId/documents/:id", async (req, res) => {
    try {
      const validatedData = insertOutcomeDocumentSchema.partial().parse(req.body);
      const document = await storage.updateOutcomeDocument(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to update outcome document", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/outcomes/:outcomeId/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteOutcomeDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete outcome document", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Outcome Checklist Item routes
  app.get("/api/outcomes/:outcomeId/checklist", async (req, res) => {
    try {
      const items = await storage.getOutcomeChecklistItems(req.params.outcomeId);
      res.json(items);
    } catch (error) {
      logger.error("Failed to fetch checklist items", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/outcomes/:outcomeId/checklist", async (req, res) => {
    try {
      const validatedData = insertOutcomeChecklistItemSchema.parse({
        ...req.body,
        outcomeId: req.params.outcomeId,
      });
      const item = await storage.createOutcomeChecklistItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create checklist item", error);
      res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.patch("/api/outcomes/:outcomeId/checklist/:id", async (req, res) => {
    try {
      const validatedData = insertOutcomeChecklistItemSchema.partial().parse(req.body);
      const item = await storage.updateOutcomeChecklistItem(req.params.id, validatedData);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to update checklist item", error);
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.delete("/api/outcomes/:outcomeId/checklist/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteOutcomeChecklistItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete checklist item", error);
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  // Milestone routes
  app.get("/api/milestones", async (req, res) => {
    try {
      const milestones = await storage.getAllMilestones();
      res.json(milestones);
    } catch (error) {
      logger.error("Failed to fetch all milestones", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.get("/api/milestones/:tacticId", async (req, res) => {
    try {
      const milestones = await storage.getMilestonesByTactic(req.params.tacticId);
      res.json(milestones);
    } catch (error) {
      logger.error("Failed to fetch milestones", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.patch("/api/milestones/:id", async (req, res) => {
    try {
      // Get the old milestone to compare status changes
      const allMilestones = await storage.getAllMilestones();
      const oldMilestone = allMilestones.find(m => m.id === req.params.id);
      
      const milestone = await storage.updateMilestone(req.params.id, req.body);
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      // Send notification when milestone is completed
      if (oldMilestone && oldMilestone.status !== "completed" && milestone.status === "completed") {
        const tactic = await storage.getTactic(milestone.tacticId);
        if (tactic) {
          const assignedUserIds = JSON.parse(tactic.accountableLeaders);
          await notifyMilestoneCompleted(tactic.id, tactic.title, milestone.milestoneNumber, assignedUserIds);
        }
      }
      
      res.json(milestone);
    } catch (error) {
      logger.error("Failed to update milestone", error);
      res.status(500).json({ message: "Failed to update milestone" });
    }
  });

  // Communication Template routes
  app.get("/api/communication-templates/:tacticId", async (req, res) => {
    try {
      let templates = await storage.getCommunicationTemplatesByTactic(req.params.tacticId);
      
      // Auto-create templates if they don't exist for this tactic
      if (templates.length === 0) {
        templates = await storage.createCommunicationTemplates(req.params.tacticId);
      }
      
      res.json(templates);
    } catch (error) {
      logger.error("Failed to fetch communication templates", error);
      res.status(500).json({ message: "Failed to fetch communication templates" });
    }
  });

  app.patch("/api/communication-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateCommunicationTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Communication template not found" });
      }
      res.json(template);
    } catch (error) {
      logger.error("Failed to update communication template", error);
      res.status(500).json({ message: "Failed to update communication template" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      logger.error("Failed to fetch notifications", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // First, verify the notification exists and belongs to the user BEFORE mutating
      const userNotifications = await storage.getNotificationsByUser(userId);
      const notificationToUpdate = userNotifications.find(n => n.id === req.params.id);
      
      if (!notificationToUpdate) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Now that ownership is verified, perform the mutation
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      logger.error("Failed to mark notification as read", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/:id/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // First, verify the notification exists and belongs to the user BEFORE mutating
      const userNotifications = await storage.getNotificationsByUser(userId);
      const notificationToUpdate = userNotifications.find(n => n.id === req.params.id);
      
      if (!notificationToUpdate) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Now that ownership is verified, perform the mutation
      const notification = await storage.markNotificationAsUnread(req.params.id);
      res.json(notification);
    } catch (error) {
      logger.error("Failed to mark notification as unread", error);
      res.status(500).json({ message: "Failed to mark notification as unread" });
    }
  });

  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      logger.error("Failed to mark all notifications as read", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // First, get the notification to verify ownership
      const notifications = await storage.getNotificationsByUser(userId);
      const notification = notifications.find(n => n.id === req.params.id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Delete the notification
      const deleted = await storage.deleteNotification(req.params.id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete notification" });
      }
      
      res.json({ message: "Notification deleted" });
    } catch (error) {
      logger.error("Failed to delete notification", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
