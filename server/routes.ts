import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStrategySchema, insertProjectSchema, insertActionSchema, insertActionDocumentSchema, insertActionChecklistItemSchema, insertMeetingNoteSchema, insertBarrierSchema, insertDependencySchema, insertTemplateTypeSchema, insertExecutiveGoalSchema, insertTeamTagSchema, insertUserStrategyAssignmentSchema, insertProjectResourceAssignmentSchema, insertActionPeopleAssignmentSchema, insertPtoEntrySchema, insertHolidaySchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./jwtAuth";
import { z, ZodSchema, ZodError } from "zod";
import { logger } from "./logger";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { notifyActionCompleted, notifyActionAchieved, notifyProjectProgress, notifyProjectStatusChanged, notifyStrategyStatusChanged, notifyReadinessRatingChanged, notifyRiskExposureChanged } from "./notifications";
import { clearActionNotificationTracking } from "./scheduler";

// Validation middleware factory
function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        logger.warn(`[SECURITY] Input validation failed: ${messages}`);
        return res.status(400).json({ 
          message: "Invalid input data",
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      return res.status(400).json({ message: "Invalid request body" });
    }
  };
}

// Common validation schemas
const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  role: z.enum(["administrator", "co_lead", "view", "sme"]).optional()
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(["administrator", "co_lead", "view", "sme"]).optional(),
  fte: z.number().min(0).max(10).optional(),
  salary: z.number().min(0).optional()
}).strict();

const strategyAssignmentSchema = z.object({
  strategyId: z.number().int().positive("Strategy ID is required")
});

const resourceAssignmentSchema = z.object({
  assignedUserId: z.string().min(1, "User ID is required"),
  hoursPerWeek: z.coerce.number().min(0).max(168, "Hours per week cannot exceed 168")
});

const peopleAssignmentSchema = z.object({
  assignedUserId: z.string().min(1, "User ID is required")
});

const capacityUpdateSchema = z.object({
  fte: z.number().min(0).max(10).optional(),
  salary: z.number().min(0).optional()
});

const aiChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(10000),
  conversationId: z.number().int().positive().optional().nullable()
});

const reorderSchema = z.object({
  strategies: z.array(z.object({
    id: z.number().int().positive(),
    sortOrder: z.number().int().min(0)
  }))
});

const executiveGoalsUpdateSchema = z.object({
  executiveGoalIds: z.array(z.string())
});

const teamTagsUpdateSchema = z.object({
  teamTagIds: z.array(z.string())
});

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

  // Config endpoint for Syncfusion license (auth required)
  app.get("/api/config/syncfusion", isAuthenticated, (req: any, res) => {
    const licenseKey = process.env.SYNCFUSION_LICENSE_KEY || '';
    res.json({ licenseKey });
  });

  // User routes
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      let users;
      
      // Super Admins can see all users across all organizations
      if (user.isSuperAdmin === 'true') {
        users = await storage.getAllUsers();
      } else {
        // Regular users only see users in their organization
        users = user.organizationId 
          ? await storage.getUsersByOrganization(user.organizationId)
          : [];
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (!requestingUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify organization access (Super Admins can access all, others only their org)
      if (requestingUser.isSuperAdmin !== 'true' && 
          requestingUser.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", isAuthenticated, validateBody(createUserSchema), async (req: any, res) => {
    try {
      // Check if the requesting user is an administrator
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (!requestingUser || requestingUser.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can add users" });
      }

      const { firstName, lastName, email } = req.body;

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

  app.patch("/api/users/:id", isAuthenticated, validateBody(updateUserSchema.partial()), async (req: any, res) => {
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
      
      // Get target user and verify organization ownership (Super Admins can update any user)
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (requestingUser.isSuperAdmin !== 'true' && 
          requestingUser.organizationId !== targetUser.organizationId) {
        return res.status(403).json({ message: "Cannot modify users from other organizations" });
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
      
      // Verify target user belongs to same organization (Super Admins can delete any user)
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (requestingUser.isSuperAdmin !== 'true' && 
          requestingUser.organizationId !== targetUser.organizationId) {
        return res.status(403).json({ message: "Cannot delete users from other organizations" });
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

  app.post("/api/users/:userId/strategy-assignments", isAuthenticated, validateBody(strategyAssignmentSchema), async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Only administrators can assign strategies
      if (requestingUser?.role !== 'administrator') {
        return res.status(403).json({ message: "Forbidden: Only administrators can assign strategies" });
      }

      const { strategyId } = req.body;

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
      
      // Super Admins can see all strategies across all organizations
      if (user.isSuperAdmin === 'true') {
        strategies = await storage.getAllStrategies();
      } else if (user.role === 'administrator') {
        // Administrators see all strategies in their organization
        strategies = user.organizationId 
          ? await storage.getStrategiesByOrganization(user.organizationId)
          : [];
      } else {
        // Co-Lead and View users see only assigned strategies in their organization
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const orgStrategies = user.organizationId 
          ? await storage.getStrategiesByOrganization(user.organizationId)
          : [];
        strategies = orgStrategies.filter(s => assignedStrategyIds.includes(s.id));
      }
      
      res.json(strategies);
    } catch (error) {
      logger.error("Failed to fetch strategies", error);
      res.status(500).json({ message: "Failed to fetch strategies" });
    }
  });

  app.get("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      // Verify organization access
      if (user.isSuperAdmin !== 'true' && 
          user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For non-administrators, also check strategy assignment
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(strategy.id)) {
          return res.status(403).json({ message: "Access denied to this strategy" });
        }
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

  app.post("/api/strategies", isAuthenticated, validateBody(insertStrategySchema), async (req: any, res) => {
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
      
      const strategy = await storage.createStrategy({
        ...validatedData,
        organizationId: user.organizationId,
        createdBy: userId,
      });
      res.status(201).json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create strategy", error);
      res.status(500).json({ message: "Failed to create strategy" });
    }
  });

  app.patch("/api/strategies/:id", isAuthenticated, validateBody(insertStrategySchema.partial()), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can update strategies
      if (!user || (user.role !== 'administrator' && user.isSuperAdmin !== 'true')) {
        return res.status(403).json({ message: "Forbidden: Only administrators can update strategies" });
      }

      // Get the old strategy to compare changes
      const oldStrategy = await storage.getStrategy(req.params.id);
      
      // Verify organization ownership (unless Super Admin)
      if (oldStrategy && user.isSuperAdmin !== 'true' && user.organizationId !== oldStrategy.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
      }
      
      // Use partial schema for PATCH to allow updating individual fields
      const validatedData = insertStrategySchema.partial().parse(req.body);
      
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
        
        // Clean up dependencies when strategy is archived or completed
        if ((strategy.status === 'Archived' || strategy.status === 'Completed') && 
            oldStrategy.status !== 'Archived' && oldStrategy.status !== 'Completed') {
          const strategyProjects = await storage.getProjectsByStrategy(req.params.id);
          const strategyActions = await storage.getActionsByStrategy(req.params.id);
          const projectIds = strategyProjects.map((p: any) => p.id);
          const actionIds = strategyActions.map((a: any) => a.id);
          await storage.deleteDependenciesForEntities(projectIds, actionIds, strategy.organizationId || undefined);
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
  app.post("/api/strategies/reorder", isAuthenticated, validateBody(reorderSchema), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can reorder strategies
      if (!user || (user.role !== 'administrator' && user.isSuperAdmin !== 'true')) {
        return res.status(403).json({ message: "Forbidden: Only administrators can reorder strategies" });
      }
      
      const { strategyOrders } = req.body;
      if (!Array.isArray(strategyOrders)) {
        return res.status(400).json({ message: "strategyOrders must be an array" });
      }
      
      // Verify all strategies belong to user's organization (unless Super Admin)
      if (user.isSuperAdmin !== 'true') {
        for (const { id } of strategyOrders) {
          const strategy = await storage.getStrategy(id);
          if (strategy && strategy.organizationId !== user.organizationId) {
            return res.status(403).json({ message: "Forbidden: You do not have access to one or more strategies" });
          }
        }
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
      if (!user || (user.role !== 'administrator' && user.isSuperAdmin !== 'true')) {
        return res.status(403).json({ message: "Forbidden: Only administrators can delete strategies" });
      }
      
      // Verify organization ownership (unless Super Admin)
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
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
      if (!user || (user.role !== 'administrator' && user.isSuperAdmin !== 'true')) {
        return res.status(403).json({ message: "Forbidden: Only administrators can complete strategies" });
      }
      
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      // Verify organization ownership (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
      }

      // Only update status and completionDate, keep other fields unchanged
      const updatedStrategy = await storage.updateStrategy(req.params.id, {
        ...strategy,
        status: 'Completed',
        completionDate: new Date(),
      });

      // Remove all dependencies involving this strategy's projects and actions
      const strategyProjects = await storage.getProjectsByStrategy(req.params.id);
      const strategyActions = await storage.getActionsByStrategy(req.params.id);
      
      const projectIds = strategyProjects.map((p: any) => p.id);
      const actionIds = strategyActions.map((a: any) => a.id);
      await storage.deleteDependenciesForEntities(projectIds, actionIds, strategy.organizationId || undefined);

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
      if (!user || (user.role !== 'administrator' && user.isSuperAdmin !== 'true')) {
        return res.status(403).json({ message: "Forbidden: Only administrators can archive strategies" });
      }

      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      
      // Verify organization ownership (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
      }

      if (strategy.status !== 'Completed') {
        return res.status(400).json({ message: "Only completed strategies can be archived" });
      }

      // Update strategy status to Archived
      await storage.updateStrategy(req.params.id, {
        ...strategy,
        status: 'Archived',
      });

      // Cascade archive to all projects (use organization-scoped query for defense-in-depth)
      const projects = user.organizationId 
        ? await storage.getProjectsByOrganization(user.organizationId)
        : await storage.getAllProjects();
      const strategyProjects = projects.filter((p: any) => p.strategyId === req.params.id);
      for (const project of strategyProjects) {
        await storage.updateProject(project.id, { ...project, isArchived: 'true' });
      }

      // Cascade archive to all actions (use organization-scoped query for defense-in-depth)
      const actions = user.organizationId 
        ? await storage.getActionsByOrganization(user.organizationId)
        : await storage.getAllActions();
      const strategyActions = actions.filter((a: any) => a.strategyId === req.params.id);
      for (const action of strategyActions) {
        await storage.updateAction(action.id, { ...action, isArchived: 'true' });
      }

      // Remove all dependencies involving archived projects and actions
      const projectIds = strategyProjects.map((p: any) => p.id);
      const actionIds = strategyActions.map((a: any) => a.id);
      await storage.deleteDependenciesForEntities(projectIds, actionIds, strategy.organizationId || undefined);

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
      
      // First get the base set of projects based on organization and role
      if (user.isSuperAdmin === 'true') {
        // Super Admins see all projects across all organizations
        projects = await storage.getAllProjects();
      } else if (user.organizationId) {
        // All other users are limited to their organization first
        projects = await storage.getProjectsByOrganization(user.organizationId);
        
        // Non-administrator roles are further limited to assigned strategies
        if (user.role !== 'administrator') {
          const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
          projects = projects.filter((p: any) => assignedStrategyIds.includes(p.strategyId));
        }
      } else {
        projects = [];
      }
      
      // Then apply query filters on top of the organization-scoped results
      if (strategyId) {
        projects = projects.filter((p: any) => p.strategyId === strategyId);
      }
      if (assignedTo) {
        projects = projects.filter((p: any) => {
          try {
            const leaders = JSON.parse(p.accountableLeaders);
            return Array.isArray(leaders) && leaders.includes(assignedTo);
          } catch {
            return p.accountableLeaders === assignedTo;
          }
        });
      }
      
      res.json(projects);
    } catch (error) {
      logger.error("Failed to fetch projects", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify organization access
      if (user.isSuperAdmin !== 'true' && 
          user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For non-administrators, also check strategy assignment
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Access denied to this project" });
        }
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, validateBody(insertProjectSchema), async (req: any, res) => {
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
      
      const project = await storage.createProject({
        ...validatedData,
        organizationId: user.organizationId,
      });

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

  app.patch("/api/projects/:id", isAuthenticated, validateBody(insertProjectSchema.partial()), async (req: any, res) => {
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
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== oldProject.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(oldProject.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      // Process the update data - convert date strings to Date objects
      const updateData = { ...req.body };
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.dueDate) {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      // Handle nullable URL fields
      if (updateData.documentFolderUrl === '') {
        updateData.documentFolderUrl = null;
      }
      if (updateData.communicationUrl === '') {
        updateData.communicationUrl = null;
      }
      
      // Set completionDate when status changes to 'C' (Complete)
      if (updateData.status === 'C' && oldProject.status !== 'C') {
        updateData.completionDate = new Date();
      } else if (updateData.status && updateData.status !== 'C' && oldProject.status === 'C') {
        // Clear completionDate if status changes away from Complete
        updateData.completionDate = null;
      }
      
      const project = await storage.updateProject(req.params.id, updateData);
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
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
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

  // Barrier routes
  app.get("/api/barriers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { projectId } = req.query;
      
      // Determine organizationId for filtering (Super Admins see all, regular users see their org only)
      // Non-super-admin users must have an organizationId to access barriers
      if (user.isSuperAdmin !== 'true' && !user.organizationId) {
        return res.status(403).json({ message: "Forbidden: User not associated with an organization" });
      }
      const filterOrgId = user.isSuperAdmin === 'true' ? undefined : user.organizationId!;
      
      // If projectId is provided, return barriers for that project
      if (projectId) {
        // Get the project to check organization and strategy access
        const project = await storage.getProject(projectId as string);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Verify user has access to this project's organization (unless Super Admin)
        if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this project's organization" });
        }
        
        // Check if user has access to the strategy (administrators and super admins see all, others need assignment)
        if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
          const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
          if (!assignedStrategyIds.includes(project.strategyId)) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
          }
        }
        
        const barriers = await storage.getBarriersByProject(projectId as string, filterOrgId);
        return res.json(barriers);
      }
      
      // If no projectId, return all barriers for user's assigned strategies
      const allBarriers = await storage.getAllBarriers(filterOrgId);
      
      if (user.role === 'administrator') {
        // Administrators see all barriers in their organization
        return res.json(allBarriers);
      }
      
      // Filter barriers to only those in user's assigned strategies (use org-scoped query)
      const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
      const allProjects = user.organizationId 
        ? await storage.getProjectsByOrganization(user.organizationId)
        : await storage.getAllProjects();
      const accessibleProjectIds = allProjects
        .filter((p: any) => assignedStrategyIds.includes(p.strategyId))
        .map((p: any) => p.id);
      
      const accessibleBarriers = allBarriers.filter((b: any) => 
        accessibleProjectIds.includes(b.projectId)
      );
      
      res.json(accessibleBarriers);
    } catch (error) {
      logger.error("Failed to fetch barriers", error);
      res.status(500).json({ message: "Failed to fetch barriers" });
    }
  });

  app.post("/api/barriers", isAuthenticated, validateBody(insertBarrierSchema), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot create barriers
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot create barriers" });
      }
      
      const validatedData = insertBarrierSchema.parse(req.body);
      
      // Get the project first to validate access and derive organizationId
      const project = await storage.getProject(validatedData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify user has access to this project's organization (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project's organization" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      // Derive organizationId from the project (security: prevent cross-tenant barriers)
      const barrierData = {
        ...validatedData,
        createdBy: user.id,
        organizationId: project.organizationId,
      };
      
      const barrier = await storage.createBarrier(barrierData);
      
      // Create activity for barrier creation
      await storage.createActivity({
        type: 'barrier_created',
        description: `Barrier "${barrier.title}" (${barrier.severity} severity) created for project "${project.title}"`,
        userId: user.id,
        strategyId: project.strategyId,
        projectId: project.id,
      });

      res.status(201).json(barrier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create barrier", error);
      res.status(500).json({ message: "Failed to create barrier" });
    }
  });

  app.patch("/api/barriers/:id", isAuthenticated, validateBody(insertBarrierSchema.partial()), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot update barriers
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot update barriers" });
      }
      
      // Get the existing barrier
      const existingBarrier = await storage.getBarrier(req.params.id);
      if (!existingBarrier) {
        return res.status(404).json({ message: "Barrier not found" });
      }
      
      // Get the project to check strategy access and organization
      const project = await storage.getProject(existingBarrier.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify user has access to this project's organization (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project's organization" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      // Prevent changing projectId, createdBy, and organizationId (security: prevent ownership/tenant transfer)
      const { projectId: _, createdBy: __, organizationId: ___, ...updateData } = req.body;
      
      const barrier = await storage.updateBarrier(req.params.id, updateData);
      if (!barrier) {
        return res.status(404).json({ message: "Barrier not found" });
      }
      
      // Create activity for barrier status changes
      if (req.body.status && existingBarrier.status !== req.body.status) {
        await storage.createActivity({
          type: 'barrier_status_changed',
          description: `Barrier "${barrier.title}" status changed from ${existingBarrier.status} to ${barrier.status}`,
          userId: user.id,
          strategyId: project.strategyId,
          projectId: project.id,
        });
      }

      res.json(barrier);
    } catch (error) {
      logger.error("Failed to update barrier", error);
      res.status(500).json({ message: "Failed to update barrier" });
    }
  });

  app.delete("/api/barriers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot delete barriers
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot delete barriers" });
      }
      
      // Get the existing barrier
      const existingBarrier = await storage.getBarrier(req.params.id);
      if (!existingBarrier) {
        return res.status(404).json({ message: "Barrier not found" });
      }
      
      // Get the project to check strategy access and organization
      const project = await storage.getProject(existingBarrier.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify user has access to this project's organization (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project's organization" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }

      const deleted = await storage.deleteBarrier(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Barrier not found" });
      }

      // Create activity for barrier deletion
      await storage.createActivity({
        type: 'barrier_deleted',
        description: `Barrier "${existingBarrier.title}" (${existingBarrier.severity} severity) deleted from project "${project.title}"`,
        userId: user.id,
        strategyId: project.strategyId,
        projectId: project.id,
      });

      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete barrier", error);
      res.status(500).json({ message: "Failed to delete barrier" });
    }
  });

  // Dependency routes
  app.get("/api/dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Non-super-admin users must have an organizationId to access dependencies
      if (user.isSuperAdmin !== 'true' && !user.organizationId) {
        return res.status(403).json({ message: "Forbidden: User not associated with an organization" });
      }
      
      // Determine organizationId for filtering (Super Admins see all, regular users see their org only)
      const filterOrgId = user.isSuperAdmin === 'true' ? undefined : user.organizationId!;

      const { sourceType, sourceId, targetType, targetId } = req.query;
      
      let dependencies;
      
      if (sourceType && sourceId) {
        dependencies = await storage.getDependenciesBySource(sourceType as string, sourceId as string, filterOrgId);
      } else if (targetType && targetId) {
        dependencies = await storage.getDependenciesByTarget(targetType as string, targetId as string, filterOrgId);
      } else {
        dependencies = await storage.getAllDependencies(filterOrgId);
      }
      
      // Filter dependencies based on user access to strategies (for non-admin, non-super-admin users)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const allProjects = user.organizationId 
          ? await storage.getProjectsByOrganization(user.organizationId)
          : await storage.getAllProjects();
        const allActions = user.organizationId 
          ? await storage.getActionsByOrganization(user.organizationId)
          : await storage.getAllActions();
        
        const accessibleProjectIds = allProjects
          .filter((p: any) => assignedStrategyIds.includes(p.strategyId))
          .map((p: any) => p.id);
        
        const accessibleActionIds = allActions
          .filter((a: any) => assignedStrategyIds.includes(a.strategyId))
          .map((a: any) => a.id);
        
        dependencies = dependencies.filter((d: any) => {
          const sourceAccessible = 
            (d.sourceType === 'project' && accessibleProjectIds.includes(d.sourceId)) ||
            (d.sourceType === 'action' && accessibleActionIds.includes(d.sourceId));
          const targetAccessible = 
            (d.targetType === 'project' && accessibleProjectIds.includes(d.targetId)) ||
            (d.targetType === 'action' && accessibleActionIds.includes(d.targetId));
          return sourceAccessible && targetAccessible;
        });
      }
      
      res.json(dependencies);
    } catch (error) {
      logger.error("Failed to fetch dependencies", error);
      res.status(500).json({ message: "Failed to fetch dependencies" });
    }
  });

  app.post("/api/dependencies", isAuthenticated, validateBody(insertDependencySchema), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot create dependencies
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot create dependencies" });
      }
      
      const validatedData = insertDependencySchema.parse(req.body);
      
      // Get the source item to derive organizationId
      let sourceItem: any = null;
      let sourceOrganizationId: string | null = null;
      if (validatedData.sourceType === 'project') {
        sourceItem = await storage.getProject(validatedData.sourceId);
        sourceOrganizationId = sourceItem?.organizationId || null;
      } else if (validatedData.sourceType === 'action') {
        sourceItem = await storage.getAction(validatedData.sourceId);
        // For actions, get organizationId from the parent project
        if (sourceItem?.projectId) {
          const parentProject = await storage.getProject(sourceItem.projectId);
          sourceOrganizationId = parentProject?.organizationId || null;
        }
      }
      
      if (!sourceItem) {
        return res.status(404).json({ message: "Source item not found" });
      }
      
      if (!sourceOrganizationId) {
        return res.status(400).json({ message: "Could not determine organization for source item" });
      }
      
      // Verify user has access to this organization (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== sourceOrganizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this organization" });
      }
      
      // Get the target item to verify access
      let targetItem: any = null;
      let targetOrganizationId: string | null = null;
      if (validatedData.targetType === 'project') {
        targetItem = await storage.getProject(validatedData.targetId);
        targetOrganizationId = targetItem?.organizationId || null;
      } else if (validatedData.targetType === 'action') {
        targetItem = await storage.getAction(validatedData.targetId);
        if (targetItem?.projectId) {
          const parentProject = await storage.getProject(targetItem.projectId);
          targetOrganizationId = parentProject?.organizationId || null;
        }
      }
      
      if (!targetItem) {
        return res.status(404).json({ message: "Target item not found" });
      }
      
      // Verify target is in the same organization
      if (sourceOrganizationId !== targetOrganizationId) {
        return res.status(400).json({ message: "Cannot create dependencies across different organizations" });
      }
      
      // Verify user has access to both source and target items' strategies (for non-admin, non-super-admin users)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        
        const sourceStrategyId = sourceItem.strategyId;
        const targetStrategyId = targetItem.strategyId;
        
        if (!sourceStrategyId || !assignedStrategyIds.includes(sourceStrategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to the source item's strategy" });
        }
        
        if (!targetStrategyId || !assignedStrategyIds.includes(targetStrategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to the target item's strategy" });
        }
      }
      
      // Create dependency with organizationId derived from source item
      const dependencyData = {
        ...validatedData,
        createdBy: user.id,
        organizationId: sourceOrganizationId,
      };
      
      const dependency = await storage.createDependency(dependencyData);
      
      // Get source and target titles for activity log
      let sourceTitle = 'Unknown';
      let targetTitle = 'Unknown';
      let strategyId: string | null = null;
      
      if (dependencyData.sourceType === 'project') {
        const project = await storage.getProject(dependencyData.sourceId);
        sourceTitle = project?.title || 'Unknown';
        strategyId = project?.strategyId || null;
      } else if (dependencyData.sourceType === 'action') {
        const action = await storage.getAction(dependencyData.sourceId);
        sourceTitle = action?.title || 'Unknown';
        strategyId = action?.strategyId || null;
      }
      
      if (dependencyData.targetType === 'project') {
        const project = await storage.getProject(dependencyData.targetId);
        targetTitle = project?.title || 'Unknown';
      } else if (dependencyData.targetType === 'action') {
        const action = await storage.getAction(dependencyData.targetId);
        targetTitle = action?.title || 'Unknown';
      }
      
      await storage.createActivity({
        type: 'dependency_created',
        description: `Dependency created: ${dependencyData.sourceType} "${sourceTitle}" depends on ${dependencyData.targetType} "${targetTitle}"`,
        userId: user.id,
        strategyId,
      });

      res.status(201).json(dependency);
    } catch (error) {
      logger.error("Failed to create dependency", error);
      res.status(500).json({ message: "Failed to create dependency" });
    }
  });

  app.delete("/api/dependencies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // View role cannot delete dependencies
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot delete dependencies" });
      }
      
      const dependencyId = req.params.id;
      
      // Determine organizationId for filtering (Super Admins see all, regular users see their org only)
      const filterOrgId = user.isSuperAdmin === 'true' ? undefined : (user.organizationId || undefined);
      
      // Get the dependency to log activity (filtered by organization)
      const allDependencies = await storage.getAllDependencies(filterOrgId);
      const existingDependency = allDependencies.find((d: any) => d.id === dependencyId);
      
      if (!existingDependency) {
        return res.status(404).json({ message: "Dependency not found" });
      }
      
      // Verify user has access to the source item's organization (unless Super Admin)
      if (user.isSuperAdmin !== 'true') {
        let sourceOrganizationId: string | null = null;
        if (existingDependency.sourceType === 'project') {
          const sourceProject = await storage.getProject(existingDependency.sourceId);
          sourceOrganizationId = sourceProject?.organizationId || null;
        } else if (existingDependency.sourceType === 'action') {
          const sourceAction = await storage.getAction(existingDependency.sourceId);
          if (sourceAction?.projectId) {
            const parentProject = await storage.getProject(sourceAction.projectId);
            sourceOrganizationId = parentProject?.organizationId || null;
          }
        }
        
        if (user.organizationId !== sourceOrganizationId) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this organization" });
        }
      }
      
      // Verify user has access to the source item's strategy (for non-admin, non-super-admin users)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        
        let sourceStrategyId: string | null = null;
        if (existingDependency.sourceType === 'project') {
          const sourceProject = await storage.getProject(existingDependency.sourceId);
          sourceStrategyId = sourceProject?.strategyId || null;
        } else if (existingDependency.sourceType === 'action') {
          const sourceAction = await storage.getAction(existingDependency.sourceId);
          sourceStrategyId = sourceAction?.strategyId || null;
        }
        
        if (!sourceStrategyId || !assignedStrategyIds.includes(sourceStrategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this dependency" });
        }
      }
      
      const success = await storage.deleteDependency(dependencyId);
      
      if (!success) {
        return res.status(404).json({ message: "Dependency not found" });
      }
      
      // Get source title for activity log
      let sourceTitle = 'Unknown';
      let strategyId: string | null = null;
      
      if (existingDependency.sourceType === 'project') {
        const project = await storage.getProject(existingDependency.sourceId);
        sourceTitle = project?.title || 'Unknown';
        strategyId = project?.strategyId || null;
      } else if (existingDependency.sourceType === 'action') {
        const action = await storage.getAction(existingDependency.sourceId);
        sourceTitle = action?.title || 'Unknown';
        strategyId = action?.strategyId || null;
      }
      
      await storage.createActivity({
        type: 'dependency_deleted',
        description: `Dependency deleted from ${existingDependency.sourceType} "${sourceTitle}"`,
        userId: user.id,
        strategyId,
      });

      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete dependency", error);
      res.status(500).json({ message: "Failed to delete dependency" });
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
      
      // First get the base set of activities based on organization and role
      if (user.isSuperAdmin === 'true') {
        // Super Admins see all activities across all organizations
        activities = await storage.getAllActivities();
      } else if (user.organizationId) {
        // All other users are limited to their organization first
        activities = await storage.getActivitiesByOrganization(user.organizationId);
        
        // Non-administrator roles are further limited to assigned strategies
        if (user.role !== 'administrator') {
          const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
          activities = activities.filter((a: any) => assignedStrategyIds.includes(a.strategyId));
        }
      } else {
        activities = [];
      }
      
      // Then apply query filters on top of the organization-scoped results
      if (queryUserId) {
        activities = activities.filter((a: any) => a.userId === queryUserId);
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

      let actions;
      
      // Super Admins see all actions across all organizations
      if (user.isSuperAdmin === 'true') {
        actions = await storage.getAllActions();
      } else if (user.role === 'administrator') {
        // Administrators see all actions in their organization
        actions = user.organizationId 
          ? await storage.getActionsByOrganization(user.organizationId)
          : [];
      } else {
        // Co-Lead and View users see only actions from assigned strategies in their organization
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const orgActions = user.organizationId 
          ? await storage.getActionsByOrganization(user.organizationId)
          : [];
        actions = orgActions.filter((a: any) => assignedStrategyIds.includes(a.strategyId));
      }
      
      res.json(actions);
    } catch (error) {
      logger.error("Failed to fetch actions", error);
      res.status(500).json({ message: "Failed to fetch actions" });
    }
  });

  app.post("/api/actions", isAuthenticated, validateBody(insertActionSchema), async (req: any, res) => {
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
      
      const action = await storage.createAction({
        ...validatedData,
        organizationId: user.organizationId,
      });
      
      await storage.createActivity({
        type: "action_created",
        description: `Created action: ${action.title}`,
        userId: action.createdBy,
        strategyId: action.strategyId,
        projectId: action.projectId,
        organizationId: user.organizationId,
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

  app.patch("/api/actions/:id", isAuthenticated, validateBody(insertActionSchema.partial()), async (req: any, res) => {
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
      
      // Get action's organization from its parent project
      const actionProject = oldAction.projectId ? await storage.getProject(oldAction.projectId) : null;
      const actionOrgId = actionProject?.organizationId;
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== actionOrgId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this action" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(oldAction.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }
      
      // Process the update data - support partial updates like the project endpoint
      const updateData = { ...req.body };
      if (updateData.dueDate) {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      
      // Check if due date changed - if so, clear notification tracking and delete stale notifications
      // Normalize dates to compare: convert to timestamps or treat null/undefined as equivalent
      const oldDueTime = oldAction.dueDate ? new Date(oldAction.dueDate).getTime() : null;
      const newDueTime = updateData.dueDate ? new Date(updateData.dueDate).getTime() : null;
      const dueDateChanged = oldDueTime !== newDueTime;
      if (dueDateChanged) {
        // Clear in-memory notification tracking so scheduler can send fresh notifications
        clearActionNotificationTracking(req.params.id);
        
        // Delete existing due-date notifications for this action from the database
        const deletedCount = await storage.deleteDueDateNotificationsForAction(req.params.id);
        if (deletedCount > 0) {
          logger.info(`Deleted ${deletedCount} stale due-date notifications for action: ${oldAction.title}`);
        }
      }
      
      // Set achievedDate when status changes to 'achieved'
      if (updateData.status === 'achieved' && oldAction.status !== 'achieved') {
        updateData.achievedDate = new Date();
      } else if (updateData.status && updateData.status !== 'achieved' && oldAction.status === 'achieved') {
        // Clear achievedDate if status changes away from achieved
        updateData.achievedDate = null;
      }
      
      const action = await storage.updateAction(req.params.id, updateData);
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
      
      // Get action's organization from its parent project
      const actionProject = action.projectId ? await storage.getProject(action.projectId) : null;
      const actionOrgId = actionProject?.organizationId;
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== actionOrgId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this action" });
      }
      
      // Check if user has access to the strategy (administrators see all, others need assignment)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
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

  app.post("/api/actions/:actionId/documents", isAuthenticated, validateBody(insertActionDocumentSchema), async (req: any, res) => {
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

  app.patch("/api/actions/:actionId/documents/:id", isAuthenticated, validateBody(insertActionDocumentSchema.partial()), async (req: any, res) => {
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
  // Get all checklist items across all actions (for dashboard view)
  app.get("/api/action-checklist-items", async (req, res) => {
    try {
      const items = await storage.getAllActionChecklistItems();
      res.json(items);
    } catch (error) {
      logger.error("Failed to fetch all checklist items", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.get("/api/actions/:actionId/checklist", async (req, res) => {
    try {
      const items = await storage.getActionChecklistItems(req.params.actionId);
      res.json(items);
    } catch (error) {
      logger.error("Failed to fetch checklist items", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/actions/:actionId/checklist", isAuthenticated, validateBody(insertActionChecklistItemSchema), async (req: any, res) => {
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

  app.patch("/api/actions/:actionId/checklist/:id", isAuthenticated, validateBody(insertActionChecklistItemSchema.partial()), async (req: any, res) => {
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

      let meetingNotes;
      
      // Super Admins see all meeting notes across all organizations
      if (user.isSuperAdmin === 'true') {
        meetingNotes = await storage.getAllMeetingNotes();
      } else if (user.role === 'administrator') {
        // Administrators see all meeting notes in their organization
        meetingNotes = user.organizationId 
          ? await storage.getMeetingNotesByOrganization(user.organizationId)
          : [];
      } else {
        // Co-Lead and View users see only meeting notes from assigned strategies in their organization
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const orgNotes = user.organizationId 
          ? await storage.getMeetingNotesByOrganization(user.organizationId)
          : [];
        meetingNotes = orgNotes.filter((note: any) => 
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
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== note.organizationId) {
        return res.status(403).json({ message: "Access denied to this meeting note" });
      }

      // Check access: administrators can access all, others only assigned strategies
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
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

  app.post("/api/meeting-notes", isAuthenticated, validateBody(insertMeetingNoteSchema), async (req: any, res) => {
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
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(validatedData.strategyId)) {
          return res.status(403).json({ message: "Access denied to this strategy" });
        }
      }
      
      // Inject organizationId from user context
      const note = await storage.createMeetingNote({
        ...validatedData,
        organizationId: user.organizationId,
      });
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      logger.error("Failed to create meeting note", error);
      res.status(500).json({ message: "Failed to create meeting note" });
    }
  });

  app.patch("/api/meeting-notes/:id", isAuthenticated, validateBody(insertMeetingNoteSchema.partial()), async (req: any, res) => {
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
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existingNote.organizationId) {
        return res.status(403).json({ message: "Access denied - you do not have access to this meeting note" });
      }

      // Check strategy access for non-administrators (must be currently assigned to the strategy)
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
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
      
      // Verify organization access (unless Super Admin)
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existingNote.organizationId) {
        return res.status(403).json({ message: "Access denied to this meeting note" });
      }

      // Check strategy access for non-administrators
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(existingNote.strategyId)) {
          return res.status(403).json({ message: "Access denied to this strategy" });
        }
      }

      // Check access: user must be the creator or an administrator/super admin
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true' && existingNote.createdBy !== userId) {
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

      // Build dynamic prompt with conditional sections
      let promptSections = [];
      
      // Strategy section (always included)
      promptSections.push(`STRATEGY:
- Title: ${strategy.title}
- Description: ${strategy.description || 'N/A'}
- Status: ${strategy.status}
- Progress: ${strategy.progress}%`);

      // Projects section (conditional)
      if (projects.length > 0) {
        promptSections.push(`PROJECTS (${projects.length} selected):
${projects.map((p, i) => `${i + 1}. ${p.title} - Status: ${p.status}, Progress: ${p.progress}%, Description: ${p.description || 'N/A'}`).join('\n')}`);
      }

      // Actions section (conditional)
      if (actions.length > 0) {
        promptSections.push(`ACTIONS (${actions.length} selected):
${actions.map((a, i) => `${i + 1}. ${a.title} - Status: ${a.status}, Description: ${a.description || 'N/A'}`).join('\n')}`);
      }

      const dataContext = promptSections.join('\n\n');

      // Build output format template
      let outputTemplate = `STRATEGY STATUS:
[Write a comprehensive status sentence that includes: current status (${strategy.status}), progress percentage (${strategy.progress}%), key accomplishments, and what's happening next]

`;

      if (projects.length > 0) {
        outputTemplate += `PROJECT UPDATES:
${projects.map((p, i) => `${i + 1}. ${p.title}: [Write a detailed update including: current status (${p.status}), progress (${p.progress}%), recent accomplishments, any blockers, and immediate next steps]`).join('\n')}

`;
      } else {
        outputTemplate += `PROJECT UPDATES:
None selected for this report.

`;
      }

      if (actions.length > 0) {
        outputTemplate += `ACTION ITEMS:
${actions.map((a, i) => `${i + 1}. ${a.title}: [Write a status update including: current state (${a.status}), what's been completed, any obstacles, and next action required]`).join('\n')}`;
      } else {
        outputTemplate += `ACTION ITEMS:
None selected for this report.`;
      }

      const prompt = `You are an executive assistant preparing a detailed status report for a strategic planning meeting. 

INSTRUCTIONS:
- Write professional, information-rich updates (not just brief summaries)
- Include progress metrics, recent accomplishments, current blockers, and next steps
- Each update should be 1-2 sentences with substantive detail
- Use the exact format provided below
- Do NOT add extra sections or commentary

DATA CONTEXT:
${dataContext}

REQUIRED OUTPUT FORMAT:
${outputTemplate}`;

      // Call OpenAI - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an executive assistant who writes detailed, professional status reports for strategic planning meetings. Your reports include specific progress metrics, accomplishments, blockers, and next steps. You write in a clear, professional tone with substantive information rather than generic summaries. You follow the exact output format provided without adding extra sections."
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
  app.post("/api/ai/chat", isAuthenticated, validateBody(aiChatSchema), async (req: any, res) => {
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

      // Get user's assigned strategies for context (filtered by organization)
      let assignedStrategies = [];
      let assignedStrategyIds: string[] = [];
      
      // Super Admins see all, regular users see their organization's data
      if (user.isSuperAdmin === 'true') {
        const strategies = await storage.getAllStrategies();
        assignedStrategies = strategies;
        assignedStrategyIds = strategies.map((s: any) => s.id);
      } else if (user.role === 'administrator') {
        // Administrators see all strategies in their organization
        const strategies = user.organizationId 
          ? await storage.getStrategiesByOrganization(user.organizationId)
          : [];
        assignedStrategies = strategies;
        assignedStrategyIds = strategies.map((s: any) => s.id);
      } else {
        // Co-Lead and View users see only assigned strategies in their organization
        assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const orgStrategies = user.organizationId 
          ? await storage.getStrategiesByOrganization(user.organizationId)
          : [];
        assignedStrategies = orgStrategies.filter((s: any) => assignedStrategyIds.includes(s.id));
      }

      // Get projects, actions, and barriers for assigned strategies (filtered by organization)
      const filterOrgId = user.isSuperAdmin === 'true' ? undefined : (user.organizationId || undefined);
      const allProjects = filterOrgId 
        ? await storage.getProjectsByOrganization(filterOrgId)
        : await storage.getAllProjects();
      const allActions = filterOrgId 
        ? await storage.getActionsByOrganization(filterOrgId)
        : await storage.getAllActions();
      const allBarriers = await storage.getAllBarriers(filterOrgId);
      
      const relevantProjects = allProjects.filter((p: any) => assignedStrategyIds.includes(p.strategyId));
      const relevantActions = allActions.filter((a: any) => 
        relevantProjects.some((p: any) => p.id === a.projectId)
      );
      const relevantBarriers = allBarriers.filter((b: any) =>
        relevantProjects.some((p: any) => p.id === b.projectId)
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
  const projectBarriers = relevantBarriers.filter((b: any) => b.projectId === p.id);
  const activeBarriers = projectBarriers.filter((b: any) => b.status === 'active' || b.status === 'mitigated');
  const highSevBarriers = activeBarriers.filter((b: any) => b.severity === 'high');
  const barrierSummary = activeBarriers.length > 0 ? `, ${activeBarriers.length} active barrier${activeBarriers.length !== 1 ? 's' : ''}${highSevBarriers.length > 0 ? ` (${highSevBarriers.length} high severity)` : ''}` : '';
  return `    - "${p.title}" (${p.status}, ${p.progress}% complete, ${projectActions.length} actions${barrierSummary})`;
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
- Monitor active barriers (especially high-severity barriers) that could impact project delivery
- Flag tensions between project execution and strategic objectives
- Identify which projects are accelerating strategic progress—and which require intervention

Outputs must be brief, decisive, and tailored for executive consumption.

BARRIERS: Projects may have associated barriers tracking risks and obstacles. Active barriers indicate current challenges; high-severity active barriers signal critical risks requiring immediate attention. Resolved or closed barriers indicate successfully mitigated risks.

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

  // Template Type routes
  app.get("/api/template-types", isAuthenticated, async (req: any, res) => {
    try {
      const templateTypes = await storage.getAllTemplateTypes();
      res.json(templateTypes);
    } catch (error) {
      logger.error("Failed to fetch template types", error);
      res.status(500).json({ message: "Failed to fetch template types" });
    }
  });

  app.post("/api/template-types", isAuthenticated, validateBody(insertTemplateTypeSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check if user is an administrator
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can create template types" });
      }

      const validatedData = insertTemplateTypeSchema.parse({
        ...req.body,
        createdBy: userId
      });

      const templateType = await storage.createTemplateType(validatedData);
      res.status(201).json(templateType);
    } catch (error) {
      logger.error("Failed to create template type", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template type data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create template type" });
    }
  });

  app.delete("/api/template-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check if user is an administrator
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can delete template types" });
      }

      const success = await storage.deleteTemplateType(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template type not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete template type", error);
      res.status(500).json({ message: "Failed to delete template type" });
    }
  });

  // Executive Goal routes (organization-scoped, admin-only management)
  app.get("/api/executive-goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const goals = await storage.getExecutiveGoalsByOrganization(user.organizationId);
      res.json(goals);
    } catch (error) {
      logger.error("Failed to fetch executive goals", error);
      res.status(500).json({ message: "Failed to fetch executive goals" });
    }
  });

  app.post("/api/executive-goals", isAuthenticated, validateBody(insertExecutiveGoalSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can create executive goals" });
      }

      if (!user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const validatedData = insertExecutiveGoalSchema.parse(req.body);

      const goal = await storage.createExecutiveGoal({
        ...validatedData,
        organizationId: user.organizationId,
        createdBy: userId
      });
      res.status(201).json(goal);
    } catch (error) {
      logger.error("Failed to create executive goal", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid executive goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create executive goal" });
    }
  });

  app.patch("/api/executive-goals/:id", isAuthenticated, validateBody(insertExecutiveGoalSchema.partial()), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can update executive goals" });
      }

      if (!user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Verify the goal belongs to the user's organization
      const existingGoal = await storage.getExecutiveGoal(req.params.id);
      if (!existingGoal) {
        return res.status(404).json({ message: "Executive goal not found" });
      }

      if (existingGoal.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot update goals from other organizations" });
      }

      const validatedData = insertExecutiveGoalSchema.partial().parse(req.body);

      const goal = await storage.updateExecutiveGoal(req.params.id, validatedData);
      if (!goal) {
        return res.status(404).json({ message: "Executive goal not found" });
      }
      res.json(goal);
    } catch (error) {
      logger.error("Failed to update executive goal", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid executive goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update executive goal" });
    }
  });

  app.delete("/api/executive-goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can delete executive goals" });
      }

      if (!user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Verify the goal belongs to the user's organization
      const existingGoal = await storage.getExecutiveGoal(req.params.id);
      if (!existingGoal) {
        return res.status(404).json({ message: "Executive goal not found" });
      }

      if (existingGoal.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot delete goals from other organizations" });
      }

      const success = await storage.deleteExecutiveGoal(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Executive goal not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete executive goal", error);
      res.status(500).json({ message: "Failed to delete executive goal" });
    }
  });

  // Strategy Executive Goals (many-to-many relationship)
  app.get("/api/strategies/:id/executive-goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Verify strategy exists and belongs to user's organization
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      if (strategy.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot access strategies from other organizations" });
      }

      const strategyGoals = await storage.getStrategyExecutiveGoals(req.params.id);
      res.json(strategyGoals);
    } catch (error) {
      logger.error("Failed to fetch strategy executive goals", error);
      res.status(500).json({ message: "Failed to fetch strategy executive goals" });
    }
  });

  app.put("/api/strategies/:id/executive-goals", isAuthenticated, validateBody(executiveGoalsUpdateSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators can set executive goals
      if (user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can assign executive goals" });
      }

      // Verify strategy exists and belongs to user's organization
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      if (strategy.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot modify strategies from other organizations" });
      }

      const { executiveGoalIds } = req.body;
      const goalIds = executiveGoalIds;
      if (!Array.isArray(goalIds)) {
        return res.status(400).json({ message: "executiveGoalIds must be an array" });
      }

      // Validate all goalIds belong to the user's organization
      if (goalIds.length > 0) {
        const orgGoals = await storage.getExecutiveGoalsByOrganization(user.organizationId);
        const orgGoalIds = new Set(orgGoals.map(g => g.id));
        const invalidGoalIds = goalIds.filter(id => !orgGoalIds.has(id));
        if (invalidGoalIds.length > 0) {
          return res.status(403).json({ 
            message: "Cannot assign executive goals from other organizations" 
          });
        }
      }

      // Clear the legacy executiveGoalId field when using junction table
      if (strategy.executiveGoalId) {
        await storage.updateStrategy(req.params.id, { executiveGoalId: null });
      }

      const strategyGoals = await storage.setStrategyExecutiveGoals(req.params.id, goalIds, user.organizationId);
      res.json(strategyGoals);
    } catch (error) {
      logger.error("Failed to set strategy executive goals", error);
      res.status(500).json({ message: "Failed to set strategy executive goals" });
    }
  });

  // Get all strategy-executive-goal mappings for the organization
  app.get("/api/strategy-executive-goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const strategies = await storage.getStrategiesByOrganization(user.organizationId);
      const allMappings = [];
      
      for (const strategy of strategies) {
        const mappings = await storage.getStrategyExecutiveGoals(strategy.id);
        allMappings.push(...mappings);
      }
      
      res.json(allMappings);
    } catch (error) {
      logger.error("Failed to fetch all strategy executive goal mappings", error);
      res.status(500).json({ message: "Failed to fetch strategy executive goal mappings" });
    }
  });

  // Team Tag routes (organization-scoped, admin-only management)
  app.get("/api/team-tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const tags = await storage.getTeamTagsByOrganization(user.organizationId);
      res.json(tags);
    } catch (error) {
      logger.error("Failed to fetch team tags", error);
      res.status(500).json({ message: "Failed to fetch team tags" });
    }
  });

  app.post("/api/team-tags", isAuthenticated, validateBody(insertTeamTagSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can create team tags" });
      }

      if (!user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const validatedData = insertTeamTagSchema.parse(req.body);

      const tag = await storage.createTeamTag({
        ...validatedData,
        organizationId: user.organizationId,
        createdBy: userId,
      });

      res.status(201).json(tag);
    } catch (error) {
      logger.error("Failed to create team tag", error);
      res.status(500).json({ message: "Failed to create team tag" });
    }
  });

  app.patch("/api/team-tags/:id", isAuthenticated, validateBody(insertTeamTagSchema.partial()), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can update team tags" });
      }

      if (!user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const existingTag = await storage.getTeamTag(req.params.id);
      if (!existingTag) {
        return res.status(404).json({ message: "Team tag not found" });
      }

      if (existingTag.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot update team tags from other organizations" });
      }

      const validatedData = insertTeamTagSchema.partial().parse(req.body);

      const tag = await storage.updateTeamTag(req.params.id, validatedData);
      res.json(tag);
    } catch (error) {
      logger.error("Failed to update team tag", error);
      res.status(500).json({ message: "Failed to update team tag" });
    }
  });

  app.delete("/api/team-tags/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can delete team tags" });
      }

      if (!user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const existingTag = await storage.getTeamTag(req.params.id);
      if (!existingTag) {
        return res.status(404).json({ message: "Team tag not found" });
      }

      if (existingTag.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot delete team tags from other organizations" });
      }

      await storage.deleteTeamTag(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete team tag", error);
      res.status(500).json({ message: "Failed to delete team tag" });
    }
  });

  // Project Team Tags (many-to-many relationship)
  app.get("/api/projects/:id/team-tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot access projects from other organizations" });
      }

      const projectTeamTags = await storage.getProjectTeamTags(req.params.id);
      res.json(projectTeamTags);
    } catch (error) {
      logger.error("Failed to fetch project team tags", error);
      res.status(500).json({ message: "Failed to fetch project team tags" });
    }
  });

  app.put("/api/projects/:id/team-tags", isAuthenticated, validateBody(teamTagsUpdateSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Administrators and co-leads can assign team tags
      if (user.role !== 'administrator' && user.role !== 'co_lead') {
        return res.status(403).json({ message: "Only administrators and co-leads can assign team tags" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot update projects from other organizations" });
      }

      const { teamTagIds } = req.body;
      if (!Array.isArray(teamTagIds)) {
        return res.status(400).json({ message: "teamTagIds must be an array" });
      }

      // Verify all tags belong to the same organization
      for (const tagId of teamTagIds) {
        const tag = await storage.getTeamTag(tagId);
        if (!tag || tag.organizationId !== user.organizationId) {
          return res.status(400).json({ message: "Invalid tag ID or tag from another organization" });
        }
      }

      const assignments = await storage.setProjectTeamTags(req.params.id, teamTagIds, user.organizationId);
      res.json(assignments);
    } catch (error) {
      logger.error("Failed to set project team tags", error);
      res.status(500).json({ message: "Failed to set project team tags" });
    }
  });

  // Get all project-team-tag mappings for the organization
  app.get("/api/project-team-tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const projects = await storage.getProjectsByOrganization(user.organizationId);
      const allMappings = [];
      
      for (const project of projects) {
        const mappings = await storage.getProjectTeamTags(project.id);
        allMappings.push(...mappings);
      }
      
      res.json(allMappings);
    } catch (error) {
      logger.error("Failed to fetch all project team tag mappings", error);
      res.status(500).json({ message: "Failed to fetch project team tag mappings" });
    }
  });

  // ==================== PROJECT RESOURCE ASSIGNMENTS (CAPACITY PLANNING) ====================

  // Get resource assignments for a project
  app.get("/api/projects/:id/resource-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot view projects from other organizations" });
      }

      const assignments = await storage.getProjectResourceAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch project resource assignments", error);
      res.status(500).json({ message: "Failed to fetch project resource assignments" });
    }
  });

  // Upsert a resource assignment for a project (add/update user with hours)
  app.post("/api/projects/:id/resource-assignments", isAuthenticated, validateBody(resourceAssignmentSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators and co-leads can assign resources
      if (user.role !== 'administrator' && user.role !== 'co_lead') {
        return res.status(403).json({ message: "Only administrators and co-leads can assign resources" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot modify projects from other organizations" });
      }

      const { assignedUserId, hoursPerWeek } = req.body;
      if (!assignedUserId) {
        return res.status(400).json({ message: "assignedUserId is required" });
      }

      // Verify the assigned user belongs to the same organization
      const assignedUser = await storage.getUser(assignedUserId);
      if (!assignedUser || assignedUser.organizationId !== user.organizationId) {
        return res.status(400).json({ message: "Invalid user ID or user from another organization" });
      }

      const assignment = await storage.upsertProjectResourceAssignment({
        projectId: req.params.id,
        userId: assignedUserId,
        hoursPerWeek: hoursPerWeek || '0',
        organizationId: user.organizationId,
        assignedBy: userId,
      });

      res.json(assignment);
    } catch (error) {
      logger.error("Failed to upsert project resource assignment", error);
      res.status(500).json({ message: "Failed to upsert project resource assignment" });
    }
  });

  // Delete a resource assignment from a project
  app.delete("/api/projects/:projectId/resource-assignments/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(currentUserId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators and co-leads can remove resources
      if (user.role !== 'administrator' && user.role !== 'co_lead') {
        return res.status(403).json({ message: "Only administrators and co-leads can remove resources" });
      }

      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot modify projects from other organizations" });
      }

      await storage.deleteProjectResourceAssignment(req.params.projectId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete project resource assignment", error);
      res.status(500).json({ message: "Failed to delete project resource assignment" });
    }
  });

  // Get all resource assignments for the organization (for capacity report)
  app.get("/api/resource-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const assignments = await storage.getResourceAssignmentsByOrganization(user.organizationId);
      res.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch all resource assignments", error);
      res.status(500).json({ message: "Failed to fetch resource assignments" });
    }
  });

  // Get people assignments for an action (for to-do list tagging)
  app.get("/api/actions/:id/people-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const action = await storage.getAction(req.params.id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }

      if (action.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot view actions from other organizations" });
      }

      const assignments = await storage.getActionPeopleAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch action people assignments", error);
      res.status(500).json({ message: "Failed to fetch action people assignments" });
    }
  });

  // Add a person to an action (for to-do list tagging)
  app.post("/api/actions/:id/people-assignments", isAuthenticated, validateBody(peopleAssignmentSchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators and co-leads can assign people
      if (user.role !== 'administrator' && user.role !== 'co_lead') {
        return res.status(403).json({ message: "Only administrators and co-leads can assign people" });
      }

      const action = await storage.getAction(req.params.id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }

      if (action.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot modify actions from other organizations" });
      }

      const { assignedUserId } = req.body;
      if (!assignedUserId) {
        return res.status(400).json({ message: "assignedUserId is required" });
      }

      // Verify the user being assigned belongs to the same organization
      const assignedUser = await storage.getUser(assignedUserId);
      if (!assignedUser || assignedUser.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot assign users from other organizations" });
      }

      const assignment = await storage.createActionPeopleAssignment({
        actionId: req.params.id,
        userId: assignedUserId,
        organizationId: user.organizationId,
        assignedBy: userId,
      });

      res.json(assignment);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ message: "User is already assigned to this action" });
      }
      logger.error("Failed to create action people assignment", error);
      res.status(500).json({ message: "Failed to create action people assignment" });
    }
  });

  // Remove a person from an action
  app.delete("/api/actions/:id/people-assignments/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(currentUserId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators and co-leads can remove people
      if (user.role !== 'administrator' && user.role !== 'co_lead') {
        return res.status(403).json({ message: "Only administrators and co-leads can remove people" });
      }

      const action = await storage.getAction(req.params.id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }

      if (action.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot modify actions from other organizations" });
      }

      await storage.deleteActionPeopleAssignment(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete action people assignment", error);
      res.status(500).json({ message: "Failed to delete action people assignment" });
    }
  });

  // Get all action people assignments for the organization
  app.get("/api/action-people-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const assignments = await storage.getActionPeopleAssignmentsByOrganization(user.organizationId);
      res.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch all action people assignments", error);
      res.status(500).json({ message: "Failed to fetch action people assignments" });
    }
  });

  // Update user FTE and salary (admin only)
  app.patch("/api/users/:id/capacity", isAuthenticated, validateBody(capacityUpdateSchema), async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || !currentUser.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators can update FTE/salary
      if (currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can update FTE and salary" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Cannot modify users from other organizations" });
      }

      const { fte, salary, serviceDeliveryHours } = req.body;
      const updates: any = {};
      
      if (fte !== undefined) {
        updates.fte = String(fte);
      }
      if (salary !== undefined) {
        updates.salary = salary === null ? null : Number(salary);
      }
      if (serviceDeliveryHours !== undefined) {
        updates.serviceDeliveryHours = String(serviceDeliveryHours);
      }

      const updatedUser = await storage.updateUser(req.params.id, updates);
      res.json(updatedUser);
    } catch (error) {
      logger.error("Failed to update user capacity", error);
      res.status(500).json({ message: "Failed to update user capacity" });
    }
  });

  // Dashboard API: Get user's to-dos (actions assigned to them that are not achieved)
  app.get("/api/my-todos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Get all action assignments for this user
      const assignments = await storage.getActionPeopleAssignmentsByUser(userId, user.organizationId);
      
      // Get the actions for these assignments, filtering out achieved ones
      const actionIds = assignments.map(a => a.actionId);
      const allActions = await storage.getActionsByOrganization(user.organizationId);
      
      // Get projects and strategies for context
      const allProjects = await storage.getProjectsByOrganization(user.organizationId);
      const allStrategies = await storage.getStrategiesByOrganization(user.organizationId);
      
      // Create lookup maps for efficient access
      const projectMap = new Map(allProjects.map(p => [p.id, p]));
      const strategyMap = new Map(allStrategies.map(s => [s.id, s]));
      
      // Filter to only assigned actions that are not achieved, and join with assignment data
      const todos = allActions
        .filter(action => actionIds.includes(action.id) && action.status !== 'achieved')
        .map(action => {
          const project = action.projectId ? projectMap.get(action.projectId) : null;
          const strategy = strategyMap.get(action.strategyId);
          return {
            ...action,
            assignmentId: assignments.find(a => a.actionId === action.id)?.id,
            projectName: project?.title || null,
            strategyName: strategy?.title || null
          };
        })
        .sort((a, b) => {
          // Sort by due date ascending (closest first), nulls last
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

      res.json(todos);
    } catch (error) {
      logger.error("Failed to fetch user's to-dos", error);
      res.status(500).json({ message: "Failed to fetch to-dos" });
    }
  });

  // Dashboard API: Get user's assigned projects (where they are a resource)
  app.get("/api/my-projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Get all resource assignments for this user
      const assignments = await storage.getResourceAssignmentsByUser(userId, user.organizationId);
      
      // Get the projects for these assignments
      const projectIds = assignments.map(a => a.projectId);
      const allProjects = await storage.getProjectsByOrganization(user.organizationId);
      
      // Filter to only assigned projects that are not archived and join with assignment data
      const myProjects = allProjects
        .filter(project => projectIds.includes(project.id) && project.isArchived !== 'true')
        .map(project => {
          const assignment = assignments.find(a => a.projectId === project.id);
          return {
            ...project,
            hoursPerWeek: assignment?.hoursPerWeek || '0',
            assignmentId: assignment?.id
          };
        })
        .sort((a, b) => {
          // Sort by due date ascending (closest first), nulls last
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

      res.json(myProjects);
    } catch (error) {
      logger.error("Failed to fetch user's projects", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // PTO Entry Routes

  // Get current user's PTO entries
  app.get("/api/users/:id/pto", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || !currentUser.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const targetUserId = req.params.id;
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const entries = await storage.getPtoEntriesByUser(targetUserId);
      res.json(entries);
    } catch (error) {
      logger.error("Failed to fetch PTO entries", error);
      res.status(500).json({ message: "Failed to fetch PTO entries" });
    }
  });

  // Create PTO entry for a user
  app.post("/api/users/:id/pto", isAuthenticated, validateBody(insertPtoEntrySchema), async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || !currentUser.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const targetUserId = req.params.id;
      
      // Users can only create PTO for themselves, or admins can create for anyone
      if (currentUserId !== targetUserId && currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "You can only create PTO entries for yourself" });
      }

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const entry = await storage.createPtoEntry({
        ...req.body,
        userId: targetUserId,
        organizationId: currentUser.organizationId,
      });
      res.status(201).json(entry);
    } catch (error) {
      logger.error("Failed to create PTO entry", error);
      res.status(500).json({ message: "Failed to create PTO entry" });
    }
  });

  // Get all PTO entries for the organization (for calendar view)
  app.get("/api/pto", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const entries = await storage.getPtoEntriesByOrganization(user.organizationId);
      
      // Join with user data for display
      const users = await storage.getUsersByOrganization(user.organizationId);
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const entriesWithUsers = entries.map(entry => {
        const entryUser = userMap.get(entry.userId);
        return {
          ...entry,
          userName: entryUser ? `${entryUser.firstName || ''} ${entryUser.lastName || ''}`.trim() || entryUser.email : 'Unknown'
        };
      });
      
      res.json(entriesWithUsers);
    } catch (error) {
      logger.error("Failed to fetch organization PTO entries", error);
      res.status(500).json({ message: "Failed to fetch PTO entries" });
    }
  });

  // Update PTO entry
  app.patch("/api/pto/:id", isAuthenticated, validateBody(insertPtoEntrySchema.partial()), async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || !currentUser.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const entry = await storage.getPtoEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "PTO entry not found" });
      }

      if (entry.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Cannot modify PTO entries from other organizations" });
      }

      // Users can only update their own PTO, or admins can update anyone's
      if (entry.userId !== currentUserId && currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "You can only update your own PTO entries" });
      }

      const updated = await storage.updatePtoEntry(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      logger.error("Failed to update PTO entry", error);
      res.status(500).json({ message: "Failed to update PTO entry" });
    }
  });

  // Delete PTO entry
  app.delete("/api/pto/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || !currentUser.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const entry = await storage.getPtoEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "PTO entry not found" });
      }

      if (entry.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Cannot delete PTO entries from other organizations" });
      }

      // Users can only delete their own PTO, or admins can delete anyone's
      if (entry.userId !== currentUserId && currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "You can only delete your own PTO entries" });
      }

      await storage.deletePtoEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete PTO entry", error);
      res.status(500).json({ message: "Failed to delete PTO entry" });
    }
  });

  // Holiday routes - Organization-wide holidays (admin only)
  
  // Get all holidays for the organization
  app.get("/api/holidays", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const holidays = await storage.getHolidaysByOrganization(user.organizationId);
      res.json(holidays);
    } catch (error) {
      logger.error("Failed to fetch holidays", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  // Create a holiday (admin only)
  app.post("/api/holidays", isAuthenticated, validateBody(insertHolidaySchema), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators can create holidays
      if (user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can create holidays" });
      }

      const holiday = await storage.createHoliday({
        ...req.body,
        organizationId: user.organizationId,
      });
      res.status(201).json(holiday);
    } catch (error) {
      logger.error("Failed to create holiday", error);
      res.status(500).json({ message: "Failed to create holiday" });
    }
  });

  // Update a holiday (admin only)
  app.patch("/api/holidays/:id", isAuthenticated, validateBody(insertHolidaySchema.partial()), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators can update holidays
      if (user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can update holidays" });
      }

      const holiday = await storage.getHoliday(req.params.id);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }

      if (holiday.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot modify holidays from other organizations" });
      }

      const updated = await storage.updateHoliday(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      logger.error("Failed to update holiday", error);
      res.status(500).json({ message: "Failed to update holiday" });
    }
  });

  // Delete a holiday (admin only)
  app.delete("/api/holidays/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      // Only administrators can delete holidays
      if (user.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can delete holidays" });
      }

      const holiday = await storage.getHoliday(req.params.id);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }

      if (holiday.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Cannot delete holidays from other organizations" });
      }

      await storage.deleteHoliday(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete holiday", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
