import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStrategySchema, insertProjectSchema, insertActionSchema, insertActionDocumentSchema, insertActionChecklistItemSchema, insertMeetingNoteSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { logger } from "./logger";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { notifyActionCompleted, notifyActionAchieved, notifyProjectProgress, notifyProjectStatusChanged, notifyStrategyStatusChanged, notifyReadinessRatingChanged, notifyRiskExposureChanged } from "./notifications";

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

  // Initialize Google Gemini client (if API key is provided)
  let gemini: GoogleGenerativeAI | null = null;
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  }

  // Determine which AI model to use for chat assistant
  const CHAT_AI_PROVIDER = process.env.CHAT_AI_PROVIDER || 'openai'; // 'openai' or 'gemini'

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

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (!requestingUser) {
        return res.status(404).json({ message: "Requesting user not found" });
      }
      
      // Only administrators can update user roles
      if (req.body.role && requestingUser.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can update user roles" });
      }
      
      // Users can only update their own profile unless they are administrators
      if (req.params.id !== requestingUserId && requestingUser.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Cannot update other users' information" });
      }
      
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      logger.error("Failed to update user", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Only administrators can delete users
      if (!requestingUser || requestingUser.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can delete users" });
      }

      // Prevent deleting yourself
      if (req.params.id === requestingUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete user", error);
      res.status(500).json({ message: "Failed to delete user" });
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
  app.get("/api/strategies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      let strategies;
      
      // Administrators see all strategies
      if (user.role === 'administrator') {
        strategies = await storage.getAllStrategies();
      } else {
        // Co-Lead and View users see only assigned strategies
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const allStrategies = await storage.getAllStrategies();
        strategies = allStrategies.filter(s => assignedStrategyIds.includes(s.id));
      }
      
      res.json(strategies);
    } catch (error) {
      logger.error("Failed to fetch strategies", error);
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

IMPORTANT: Each field must be a plain text string (not an object or array). Format multi-part content as paragraphs or bullet points within a single string.

Respond ONLY with a valid JSON object in this exact format:
{
  "caseForChange": "plain text string here...",
  "visionStatement": "plain text string here...",
  "successMetrics": "plain text string here...",
  "stakeholderMap": "plain text string here...",
  "readinessRating": "plain text string here...",
  "riskExposureRating": "plain text string here...",
  "changeChampionAssignment": "plain text string here...",
  "reinforcementPlan": "plain text string here...",
  "benefitsRealizationPlan": "plain text string here..."
}`;

      // Use GPT-5 for reasoning-based Change Continuum generation
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
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
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const generatedFields = JSON.parse(content);
      
      // Convert all fields to strings to avoid [object Object] errors
      // Recursively handles deeply nested objects/arrays
      const sanitizeValue = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        if (typeof value === 'object') {
          // If it's an array, recursively process items and join with newlines
          if (Array.isArray(value)) {
            return value.map(item => {
              if (typeof item === 'string') {
                return item;
              }
              if (typeof item === 'object' && item !== null) {
                // Recursively stringify nested objects
                return JSON.stringify(item, null, 2);
              }
              return String(item);
            }).join('\n\n');
          }
          // If it's an object, format it as readable JSON
          return JSON.stringify(value, null, 2);
        }
        // Fallback: ensure we always return a string
        return String(value);
      };

      const sanitizedFields = {
        caseForChange: sanitizeValue(generatedFields.caseForChange),
        visionStatement: sanitizeValue(generatedFields.visionStatement),
        successMetrics: sanitizeValue(generatedFields.successMetrics),
        stakeholderMap: sanitizeValue(generatedFields.stakeholderMap),
        readinessRating: sanitizeValue(generatedFields.readinessRating),
        riskExposureRating: sanitizeValue(generatedFields.riskExposureRating),
        changeChampionAssignment: sanitizeValue(generatedFields.changeChampionAssignment),
        reinforcementPlan: sanitizeValue(generatedFields.reinforcementPlan),
        benefitsRealizationPlan: sanitizeValue(generatedFields.benefitsRealizationPlan),
      };

      res.json(sanitizedFields);
    } catch (error) {
      logger.error("AI generation failed", error);
      res.status(500).json({ message: "Failed to generate Change Continuum fields. Please try again." });
    }
  });

  app.post("/api/strategies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can create strategies
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can create strategies" });
      }

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
      logger.error("Failed to create strategy", error);
      res.status(500).json({ message: "Failed to create strategy" });
    }
  });

  app.patch("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can update strategies
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can update strategies" });
      }

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
        // Get all administrators to notify
        const allUsers = await storage.getAllUsers();
        const executiveUserIds = allUsers
          .filter(u => u.role === "administrator")
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
  app.post("/api/strategies/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can reorder strategies
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can reorder strategies" });
      }
      
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

  app.delete("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can delete strategies
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can delete strategies" });
      }
      
      const deleted = await storage.deleteStrategy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json({ message: "Strategy deleted successfully" });
    } catch (error) {
      logger.error("Failed to delete strategy", error);
      res.status(500).json({ message: "Failed to delete strategy" });
    }
  });

  app.patch("/api/strategies/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can complete strategies
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can complete strategies" });
      }
      
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

  app.patch("/api/strategies/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can archive strategies
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can archive strategies" });
      }

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

      // Cascade archive to all projects
      const projects = await storage.getAllProjects();
      const strategyProjects = projects.filter((p: any) => p.strategyId === req.params.id);
      for (const project of strategyProjects) {
        await storage.updateProject(project.id, { ...project, isArchived: 'true' });
      }

      // Cascade archive to all actions
      const actions = await storage.getAllActions();
      const strategyActions = actions.filter((a: any) => a.strategyId === req.params.id);
      for (const action of strategyActions) {
        await storage.updateAction(action.id, { ...action, isArchived: 'true' });
      }

      res.json({ message: "Strategy and related items archived successfully" });
    } catch (error) {
      logger.error("Strategy archive failed", error);
      res.status(500).json({ message: "Unable to archive framework. Please ensure it's marked as completed first." });
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { strategyId, assignedTo } = req.query;
      let projects;
      
      if (strategyId) {
        projects = await storage.getProjectsByStrategy(strategyId as string);
      } else if (assignedTo) {
        projects = await storage.getProjectsByAssignee(assignedTo as string);
      } else {
        projects = await storage.getAllProjects();
      }
      
      // Filter by assigned strategies for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        projects = projects.filter((p: any) => assignedStrategyIds.includes(p.strategyId));
      }
      
      res.json(projects);
    } catch (error) {
      logger.error("Failed to fetch projects", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const validatedData = insertProjectSchema.parse(req.body);
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(validatedData.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      // View role cannot create projects
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot create projects" });
      }
      
      // Validate date range
      if (validatedData.startDate && validatedData.dueDate && 
          !validateDateRange(validatedData.startDate, validatedData.dueDate)) {
        return res.status(400).json({ message: "Start date must be before or equal to due date" });
      }
      
      const project = await storage.createProject(validatedData);

      // Recalculate parent strategy progress when a project is created
      await storage.recalculateStrategyProgress(project.strategyId);

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create project", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot update projects
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot update projects" });
      }
      
      // Get the old project to compare changes
      const oldProject = await storage.getProject(req.params.id);
      if (!oldProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(oldProject.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Send notifications for progress milestones and status changes
      if (oldProject) {
        const assignedUserIds = JSON.parse(project.accountableLeaders);
        
        // Notify for status changes
        if (oldProject.status !== project.status) {
          await notifyProjectStatusChanged(project.id, project.title, oldProject.status, project.status, assignedUserIds);
        }
        
        // Notify for progress milestones (25%, 50%, 75%, 100%)
        const oldProgress = oldProject.progress;
        const newProgress = project.progress;
        
        // Check if we crossed a milestone threshold
        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
          if (oldProgress < milestone && newProgress >= milestone) {
            await notifyProjectProgress(project.id, project.title, milestone, assignedUserIds);
            break; // Only notify for the first milestone crossed
          }
        }
      }

      // Recalculate parent strategy progress when a project is updated (non-blocking)
      try {
        await storage.recalculateStrategyProgress(project.strategyId);
      } catch (progressError) {
        logger.error("Failed to recalculate strategy progress after project update", progressError);
        // Don't fail the request if progress calculation fails
      }

      res.json(project);
    } catch (error) {
      logger.error("Project update failed", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot delete projects
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot delete projects" });
      }
      
      // Get project details before deleting to know which strategy to recalculate
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }

      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Recalculate parent strategy progress when a project is deleted
      await storage.recalculateStrategyProgress(project.strategyId);

      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete project", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Activity routes
  app.get("/api/activities", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { userId: queryUserId } = req.query;
      let activities;
      
      if (queryUserId) {
        activities = await storage.getActivitiesByUser(queryUserId as string);
      } else {
        activities = await storage.getAllActivities();
      }
      
      // Filter by assigned strategies for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        activities = activities.filter((a: any) => assignedStrategyIds.includes(a.strategyId));
      }
      
      res.json(activities);
    } catch (error) {
      logger.error("Failed to fetch activities", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Actions routes
  app.get("/api/actions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      let actions = await storage.getAllActions();
      
      // Filter by assigned strategies for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        actions = actions.filter((a: any) => assignedStrategyIds.includes(a.strategyId));
      }
      
      res.json(actions);
    } catch (error) {
      logger.error("Failed to fetch actions", error);
      res.status(500).json({ message: "Failed to fetch actions" });
    }
  });

  app.post("/api/actions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot create actions
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot create actions" });
      }
      
      const validatedData = insertActionSchema.parse(req.body);
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(validatedData.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const action = await storage.createAction(validatedData);
      
      await storage.createActivity({
        type: "action_created",
        description: `Created action: ${action.title}`,
        userId: action.createdBy,
        strategyId: action.strategyId,
        projectId: action.projectId,
      });

      // Recalculate progress: action -> project -> strategy
      if (action.projectId) {
        await storage.recalculateProjectProgress(action.projectId);
        await storage.recalculateStrategyProgress(action.strategyId);
      }
      
      res.status(201).json(action);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Action creation failed", error);
      res.status(500).json({ message: "Unable to create action. Please verify all required fields are filled." });
    }
  });

  app.patch("/api/actions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot update actions
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot update actions" });
      }
      
      // Get the old action to compare status changes
      const oldAction = await storage.getAction(req.params.id);
      if (!oldAction) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(oldAction.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const validatedData = insertActionSchema.parse(req.body);
      const action = await storage.updateAction(req.params.id, validatedData);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      await storage.createActivity({
        type: "action_updated", 
        description: `Updated action: ${action.title}`,
        userId: action.createdBy,
        strategyId: action.strategyId,
        projectId: action.projectId,
      });

      // Send notifications for status changes
      if (oldAction && oldAction.status !== "achieved" && action.status === "achieved") {
        let assignedUserIds: string[] = [];
        
        // If action is linked to a project, notify project's assigned users
        if (action.projectId) {
          const project = await storage.getProject(action.projectId);
          if (project) {
            assignedUserIds = JSON.parse(project.accountableLeaders);
          }
        }
        
        // If no project users, notify the creator of the action
        if (assignedUserIds.length === 0) {
          assignedUserIds = [action.createdBy];
        }
        
        // Send the notification
        await notifyActionAchieved(action.id, action.title, assignedUserIds);
      }

      // Recalculate progress: action -> project -> strategy
      if (action.projectId) {
        await storage.recalculateProjectProgress(action.projectId);
        await storage.recalculateStrategyProgress(action.strategyId);
      }
      
      res.json(action);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Action validation error", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Action update failed", error);
      res.status(500).json({ message: "Unable to update action. Please check your inputs and try again." });
    }
  });

  app.delete("/api/actions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot delete actions
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot delete actions" });
      }
      
      // Get action details before deleting to know which project/strategy to recalculate
      const action = await storage.getAction(req.params.id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }

      const deleted = await storage.deleteAction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Action not found" });
      }

      // Recalculate progress: action -> project -> strategy
      if (action.projectId) {
        await storage.recalculateProjectProgress(action.projectId);
        await storage.recalculateStrategyProgress(action.strategyId);
      }

      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete action", error);
      res.status(500).json({ message: "Failed to delete action" });
    }
  });

  // Action Document routes
  app.get("/api/actions/:actionId/documents", async (req, res) => {
    try {
      const documents = await storage.getActionDocuments(req.params.actionId);
      res.json(documents);
    } catch (error) {
      logger.error("Failed to fetch action documents", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/actions/:actionId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot create documents" });
      }
      
      const action = await storage.getAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const validatedData = insertActionDocumentSchema.parse({
        ...req.body,
        actionId: req.params.actionId,
      });
      const document = await storage.createActionDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create action document", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch("/api/actions/:actionId/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot update documents" });
      }
      
      const action = await storage.getAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const validatedData = insertActionDocumentSchema.partial().parse(req.body);
      const document = await storage.updateActionDocument(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to update action document", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/actions/:actionId/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot delete documents" });
      }
      
      const action = await storage.getAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const deleted = await storage.deleteActionDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete action document", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Action Checklist Item routes
  app.get("/api/actions/:actionId/checklist", async (req, res) => {
    try {
      const items = await storage.getActionChecklistItems(req.params.actionId);
      res.json(items);
    } catch (error) {
      logger.error("Failed to fetch checklist items", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/actions/:actionId/checklist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot create checklist items" });
      }
      
      const action = await storage.getAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const validatedData = insertActionChecklistItemSchema.parse({
        ...req.body,
        actionId: req.params.actionId,
      });
      const item = await storage.createActionChecklistItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create checklist item", error);
      res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.patch("/api/actions/:actionId/checklist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot update checklist items" });
      }
      
      const action = await storage.getAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      // Convert boolean isCompleted to string before validation (database stores as text 'true'/'false')
      const bodyData = {
        ...req.body,
        ...(req.body.isCompleted !== undefined && { isCompleted: String(req.body.isCompleted) })
      };
      
      const validatedData = insertActionChecklistItemSchema.partial().parse(bodyData);
      const item = await storage.updateActionChecklistItem(req.params.id, validatedData);
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

  app.delete("/api/actions/:actionId/checklist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot delete checklist items" });
      }
      
      const action = await storage.getAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(action.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      const deleted = await storage.deleteActionChecklistItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete checklist item", error);
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let notifications = await storage.getNotificationsByUser(userId);
      
      // Filter by assigned strategies for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        notifications = notifications.filter((n: any) => 
          n.strategyId && assignedStrategyIds.includes(n.strategyId)
        );
      }
      
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

  // Meeting Notes routes
  app.get("/api/meeting-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      let meetingNotes = await storage.getAllMeetingNotes();
      
      // Filter by assigned strategies for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        meetingNotes = meetingNotes.filter((note: any) => 
          assignedStrategyIds.includes(note.strategyId)
        );
      }
      
      res.json(meetingNotes);
    } catch (error) {
      logger.error("Failed to fetch meeting notes", error);
      res.status(500).json({ message: "Failed to fetch meeting notes" });
    }
  });

  app.get("/api/meeting-notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const note = await storage.getMeetingNote(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Meeting note not found" });
      }

      // Check access: administrators can access all, others only assigned strategies
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(note.strategyId)) {
          return res.status(403).json({ message: "Access denied to this meeting note" });
        }
      }

      res.json(note);
    } catch (error) {
      logger.error("Failed to fetch meeting note", error);
      res.status(500).json({ message: "Failed to fetch meeting note" });
    }
  });

  app.post("/api/meeting-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Validate request body
      const validatedData = insertMeetingNoteSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      // Check access: user must have access to the strategy
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(validatedData.strategyId)) {
          return res.status(403).json({ message: "Access denied to this strategy" });
        }
      }

      const note = await storage.createMeetingNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create meeting note", error);
      res.status(500).json({ message: "Failed to create meeting note" });
    }
  });

  app.patch("/api/meeting-notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const existingNote = await storage.getMeetingNote(req.params.id);
      if (!existingNote) {
        return res.status(404).json({ message: "Meeting note not found" });
      }

      // Check strategy access for non-administrators (must be currently assigned to the strategy)
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(existingNote.strategyId)) {
          return res.status(403).json({ message: "Access denied - you are not assigned to this strategy" });
        }
        
        // Additionally, must be the creator (not just any user assigned to the strategy)
        if (existingNote.createdBy !== userId) {
          return res.status(403).json({ message: "Only the creator or an administrator can edit this note" });
        }
      }

      // Whitelist updatable fields to prevent field spoofing
      // Note: strategyId is NOT updatable to prevent privilege escalation
      const { title, meetingDate, selectedProjectIds, selectedActionIds, notes } = req.body;
      
      // Parse and validate JSON arrays to prevent corruption
      let parsedProjectIds: string[];
      let parsedActionIds: string[];
      
      try {
        parsedProjectIds = JSON.parse(selectedProjectIds || '[]');
        parsedActionIds = JSON.parse(selectedActionIds || '[]');
        
        if (!Array.isArray(parsedProjectIds) || !Array.isArray(parsedActionIds)) {
          throw new Error("Invalid array format");
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid project or action IDs format" });
      }

      const updates = {
        title,
        meetingDate,
        selectedProjectIds: JSON.stringify(parsedProjectIds),
        selectedActionIds: JSON.stringify(parsedActionIds),
        notes
      };

      // Validate the update data with schema
      const validatedUpdates = insertMeetingNoteSchema.partial().omit({ strategyId: true, createdBy: true }).parse(updates);

      const note = await storage.updateMeetingNote(req.params.id, validatedUpdates);
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to update meeting note", error);
      res.status(500).json({ message: "Failed to update meeting note" });
    }
  });

  app.delete("/api/meeting-notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const existingNote = await storage.getMeetingNote(req.params.id);
      if (!existingNote) {
        return res.status(404).json({ message: "Meeting note not found" });
      }

      // Check strategy access for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(existingNote.strategyId)) {
          return res.status(403).json({ message: "Access denied to this strategy" });
        }
      }

      // Check access: user must be the creator or an administrator
      if (user.role !== 'administrator' && existingNote.createdBy !== userId) {
        return res.status(403).json({ message: "Only the creator or an administrator can delete this note" });
      }

      const deleted = await storage.deleteMeetingNote(req.params.id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete meeting note" });
      }

      res.json({ message: "Meeting note deleted" });
    } catch (error) {
      logger.error("Failed to delete meeting note", error);
      res.status(500).json({ message: "Failed to delete meeting note" });
    }
  });

  // Generate AI status report for meeting notes
  app.post("/api/meeting-notes/generate-ai-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { strategyId, projectIds, actionIds } = req.body;

      if (!strategyId) {
        return res.status(400).json({ message: "Strategy ID is required" });
      }

      // Check strategy access for non-administrators
      if (user.role !== 'administrator') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(strategyId)) {
          return res.status(403).json({ message: "Access denied to this strategy" });
        }
      }

      // Fetch strategy data
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      // Parse and validate project/action IDs
      let parsedProjectIds: string[];
      let parsedActionIds: string[];
      
      try {
        parsedProjectIds = JSON.parse(projectIds || '[]');
        parsedActionIds = JSON.parse(actionIds || '[]');
        
        if (!Array.isArray(parsedProjectIds) || !Array.isArray(parsedActionIds)) {
          return res.status(400).json({ message: "Invalid project or action IDs format" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid JSON format for project or action IDs" });
      }

      // Fetch projects data and verify they belong to the selected strategy
      const projects = [];
      for (const projectId of parsedProjectIds) {
        const project = await storage.getProject(projectId);
        
        // Security check: reject if project doesn't exist
        if (!project) {
          return res.status(404).json({ message: `Project not found: ${projectId}` });
        }
        
        // Security check: verify project belongs to the requested strategy
        if (project.strategyId !== strategyId) {
          return res.status(403).json({ message: "Access denied - project does not belong to selected strategy" });
        }
        
        projects.push(project);
      }

      // Fetch actions data and verify they belong to selected projects
      const actions = [];
      for (const actionId of parsedActionIds) {
        const action = await storage.getAction(actionId);
        
        // Security check: reject if action doesn't exist
        if (!action) {
          return res.status(404).json({ message: `Action not found: ${actionId}` });
        }
        
        // Security check: reject actions without a project assignment
        if (!action.projectId) {
          return res.status(403).json({ message: "Access denied - action must be assigned to a project" });
        }
        
        // Security check: verify action belongs to one of the selected projects
        if (!parsedProjectIds.includes(action.projectId)) {
          return res.status(403).json({ message: "Access denied - action does not belong to selected projects" });
        }
        
        // Security check: verify action belongs to the same strategy
        if (!action.strategyId || action.strategyId !== strategyId) {
          return res.status(403).json({ message: "Access denied - action does not belong to selected strategy" });
        }
        
        actions.push(action);
      }

      // Build prompt for OpenAI
      const prompt = `You are an executive assistant preparing a concise status report for a strategic planning meeting. Generate a professional 1-sentence status update for each item below. Focus on progress, status, and key highlights.

STRATEGY:
- Title: ${strategy.title}
- Description: ${strategy.description || 'N/A'}
- Status: ${strategy.status}
- Progress: ${strategy.progress}%

PROJECTS (${projects.length} selected):
${projects.map((p, i) => `${i + 1}. ${p.title} - Status: ${p.status}, Progress: ${p.progress}%, Description: ${p.description || 'N/A'}`).join('\n')}

ACTIONS (${actions.length} selected):
${actions.map((a, i) => `${i + 1}. ${a.title} - Status: ${a.status}, Description: ${a.description || 'N/A'}`).join('\n')}

Please provide output in this exact format:
STRATEGY STATUS:
[1-sentence status for the strategy]

PROJECT UPDATES:
${projects.map((p, i) => `${i + 1}. ${p.title}: [1-sentence update]`).join('\n')}

ACTION ITEMS:
${actions.map((a, i) => `${i + 1}. ${a.title}: [1-sentence update]`).join('\n')}`;

      // Call OpenAI - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an executive assistant who writes concise, professional status reports. Each status should be exactly one sentence that captures progress, current status, and key highlights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 8192,
      });

      const generatedReport = response.choices[0]?.message?.content || "";

      res.json({ report: generatedReport });
    } catch (error) {
      logger.error("Failed to generate AI report", error);
      res.status(500).json({ message: "Failed to generate AI report" });
    }
  });

  // AI Chat Assistant endpoint
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { message, context } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Gather context for the AI
      const userContext = {
        role: user.role,
        currentPage: context?.currentPage || 'unknown',
        firstName: user.firstName,
        lastName: user.lastName,
      };

      // Get user's assigned strategies for context
      let assignedStrategies = [];
      let assignedStrategyIds: string[] = [];
      if (user.role !== 'administrator') {
        assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const strategies = await storage.getAllStrategies();
        assignedStrategies = strategies.filter((s: any) => assignedStrategyIds.includes(s.id));
      } else {
        const strategies = await storage.getAllStrategies();
        assignedStrategies = strategies;
        assignedStrategyIds = strategies.map((s: any) => s.id);
      }

      // Get projects and actions for assigned strategies to provide real status updates
      const allProjects = await storage.getAllProjects();
      const allActions = await storage.getAllActions();
      
      const relevantProjects = allProjects.filter((p: any) => assignedStrategyIds.includes(p.strategyId));
      const relevantActions = allActions.filter((a: any) => 
        relevantProjects.some((p: any) => p.id === a.projectId)
      );

      // Get recent chat history for context (last 5 messages)
      const recentChats = await storage.getRecentChatHistory(userId, 5);
      
      // Build system prompt
      const systemPrompt = `You are an Executive Strategic Project Partner embedded within a platform that cascades from Strategy → Projects → Actions. Your primary responsibility is to help senior leaders maintain strategic alignment, understand true project health, and drive execution with precision.

CURRENT USER:
- Name: ${user.firstName || ''} ${user.lastName || ''}
- Role: ${user.role}
- Current Page: ${userContext.currentPage}

LIVE PORTFOLIO DATA:
${assignedStrategies.length > 0 ? assignedStrategies.map((s: any) => {
  const strategyProjects = relevantProjects.filter((p: any) => p.strategyId === s.id);
  return `
STRATEGY: "${s.title}" (${s.status}, ${s.progress}% complete)
  Projects (${strategyProjects.length}):
${strategyProjects.map((p: any) => {
  const projectActions = relevantActions.filter((a: any) => a.projectId === p.id);
  return `    - "${p.title}" (${p.status}, ${p.progress}% complete, ${projectActions.length} actions)`;
}).join('\n') || '    (No projects)'}`;
}).join('\n') : 'No assigned strategies'}

You will always interpret and communicate information through this cascading structure:

1. STRATEGY LEVEL — ENTERPRISE ALIGNMENT

At the Strategy tier, your role is to:
- Clarify strategic intent and success measures
- Map how projects ladder up to strategic outcomes
- Identify cross-functional dependencies, risk concentrations, and enterprise-wide implications
- Provide concise strategic insights that help executives validate whether current work is aligned, underleveraged, or at risk

Deliverables at this level must emphasize direction, prioritization, and long-range value creation.

2. PROJECT LEVEL — STATUS, RISKS, CONFIDENCE

At the Project tier, your role is to:
- Quickly diagnose true project health using a clean Red/Yellow/Green construct
- Pull forward the key signals: progress, risks, blockers, resourcing, and timeline integrity
- Flag tensions between project execution and strategic objectives
- Identify which projects are accelerating strategic progress—and which require intervention

Outputs must be brief, decisive, and tailored for executive consumption.

3. ACTION LEVEL — EXECUTION, ACCOUNTABILITY, MOMENTUM

At the Action tier, your role is to:
- Surface immediate next steps tied to owners, due dates, and dependencies
- Identify stalled actions or overdue items that threaten project timelines
- Recommend corrective actions that increase momentum, strengthen accountability, and remove friction
- Translate operational detail into clear, executive-ready summaries

The focus is tactical clarity delivered with elevated strategic framing.

COMMUNICATION STYLE:
Use an executive, conversational tone. Speak as a trusted strategic advisor—confident, forward-thinking, and focused on enabling better decisions.

CRITICAL FORMATTING RULES:
- NEVER use asterisks, underscores, or markdown syntax
- Write in plain text only - no bold, italic, or special formatting
- Use simple dashes for bullet points
- Output clean, readable text without any markdown characters

Available navigation: Dashboard, Strategies, Projects, Actions, Timeline, Meeting Notes, Reports, Settings`;

      // Call AI provider based on configuration
      let assistantMessage: string;
      
      if (CHAT_AI_PROVIDER === 'gemini') {
        // Use Google Gemini (free tier)
        if (!gemini) {
          logger.error("Gemini provider selected but GOOGLE_GEMINI_API_KEY not configured");
          return res.status(500).json({ message: "AI chat is not properly configured. Please contact your administrator." });
        }

        try {
          // Use Gemini 2.5 Flash - free tier model (10 RPM, 250K TPM, 250 RPD)
          const model = gemini.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
          });
          
          // Build conversation history for Gemini
          // Gemini requires history to start with a user message, so filter if needed
          let chatHistory = recentChats.map((chat: any) => ({
            role: chat.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: chat.message }]
          }));
          
          // Remove leading assistant messages (Gemini requires user message first)
          while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
            chatHistory.shift();
          }
          
          const chat = model.startChat({
            history: chatHistory,
          });
          
          const result = await chat.sendMessage(message);
          const responseText = result.response.text();
          
          // Strip markdown formatting (bold, italic, etc.) from Gemini response
          const cleanedText = responseText
            .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
            .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
            .replace(/__(.+?)__/g, '$1')      // Remove bold __text__
            .replace(/_(.+?)_/g, '$1');       // Remove italic _text_
          
          assistantMessage = cleanedText || "I'm sorry, I couldn't generate a response. Please try again.";
          
          logger.info("Gemini chat response generated successfully");
        } catch (geminiError: any) {
          logger.error("Gemini API error:", geminiError);
          logger.error("Gemini error details:", {
            message: geminiError.message,
            stack: geminiError.stack,
          });
          // Fallback to generic error message
          assistantMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
        }
      } else if (CHAT_AI_PROVIDER === 'openai') {
        // Use OpenAI (default, billed to Replit credits)
        try {
          const messages: any[] = [
            { role: "system", content: systemPrompt }
          ];

          // Add recent chat history
          recentChats.forEach((chat: any) => {
            messages.push({
              role: chat.role,
              content: chat.message
            });
          });

          // Add current user message
          messages.push({
            role: "user",
            content: message
          });

          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            max_tokens: 500,
          });
          
          assistantMessage = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
          
          logger.info("OpenAI chat response generated successfully");
        } catch (openaiError: any) {
          logger.error("OpenAI API error:", openaiError);
          logger.error("Error details:", {
            message: openaiError.message,
            status: openaiError.status,
            type: openaiError.type,
          });
          // Fallback to generic error message
          assistantMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
        }
      } else {
        logger.error(`Unknown CHAT_AI_PROVIDER: ${CHAT_AI_PROVIDER}`);
        return res.status(500).json({ message: "AI chat provider is not properly configured. Please contact your administrator." });
      }

      // Save both user message and assistant response to chat history
      await storage.saveChatMessage({
        userId,
        message,
        role: 'user',
        context
      });

      await storage.saveChatMessage({
        userId,
        message: assistantMessage,
        role: 'assistant',
        context
      });

      res.json({ 
        message: assistantMessage,
        context: userContext 
      });
    } catch (error) {
      logger.error("Failed to process AI chat", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/ai/chat/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getRecentChatHistory(userId, limit);
      
      res.json(history);
    } catch (error) {
      logger.error("Failed to fetch chat history", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Clear chat history
  app.delete("/api/ai/chat/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      await storage.clearChatHistory(userId);
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to clear chat history", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
