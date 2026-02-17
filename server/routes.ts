import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStrategySchema, insertProjectSchema, insertActionSchema, insertActionDocumentSchema, insertActionChecklistItemSchema, insertBarrierSchema, insertDependencySchema, insertTemplateTypeSchema, insertExecutiveGoalSchema, insertTeamTagSchema, insertUserStrategyAssignmentSchema, insertProjectResourceAssignmentSchema, insertActionPeopleAssignmentSchema, insertPtoEntrySchema, insertHolidaySchema, insertDecisionSchema, insertDecisionRaciSchema, insertWorkstreamSchema, insertPhaseSchema, insertWorkstreamDependencySchema, insertGateCriteriaSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./jwtAuth";
import { z, ZodSchema, ZodError } from "zod";
import { logger } from "./logger";
import OpenAI from "openai";
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
  strategyId: z.string().min(1, "Strategy ID is required")
});

const resourceAssignmentSchema = z.object({
  assignedUserId: z.string().min(1, "User ID is required"),
  hoursPerWeek: z.coerce.number().min(0).max(168, "Hours per week cannot exceed 168")
});

const peopleAssignmentSchema = z.object({
  assignedUserId: z.string().min(1, "User ID is required")
});

const capacityUpdateSchema = z.object({
  fte: z.coerce.number().min(0).max(10).optional(),
  salary: z.coerce.number().min(0).optional(),
  serviceDeliveryHours: z.coerce.number().min(0).max(40).optional()
});

const reorderSchema = z.object({
  strategyOrders: z.array(z.object({
    id: z.string(),
    displayOrder: z.number().int().min(0)
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
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

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
      
      // All users see only users in their organization
      users = user.organizationId 
        ? await storage.getUsersByOrganization(user.organizationId)
        : [];
      
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
      
      const organizationId = targetUser.organizationId;
      
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

  // Get all user team tags for the organization (for reports)
  app.get("/api/user-team-tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const userTeamTags = await storage.getUserTeamTagsByOrganization(user.organizationId);
      res.json(userTeamTags);
    } catch (error) {
      logger.error("Failed to fetch user team tags", error);
      res.status(500).json({ message: "Failed to fetch user team tags" });
    }
  });

  // User Team Tag routes (for tagging users to teams)
  app.get("/api/users/:id/team-tags", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      // Verify target user exists and get their organization
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Super admins can access any user; regular users must be in the same organization
      if (currentUser.isSuperAdmin !== 'true') {
        if (!currentUser.organizationId) {
          return res.status(403).json({ message: "User must belong to an organization" });
        }
        if (currentUser.organizationId !== targetUser.organizationId) {
          return res.status(403).json({ message: "Cannot access users from other organizations" });
        }
      }

      // Use target user's organization for scoped query
      const targetOrgId = targetUser.organizationId;
      if (!targetOrgId) {
        return res.json([]); // User without organization has no team tags
      }

      // Get team tags scoped by target user's organization
      const userTags = await storage.getUserTeamTags(req.params.id, targetOrgId);
      res.json(userTags);
    } catch (error) {
      logger.error("Failed to fetch user team tags", error);
      res.status(500).json({ message: "Failed to fetch user team tags" });
    }
  });

  app.put("/api/users/:id/team-tags", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      // Only administrators can update user team tags
      if (currentUser.role !== 'administrator' && currentUser.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can update user team tags" });
      }

      // Verify target user exists
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Super admins can update any user; regular admins must be in the same organization
      if (currentUser.isSuperAdmin !== 'true') {
        if (!currentUser.organizationId) {
          return res.status(403).json({ message: "User must belong to an organization" });
        }
        if (currentUser.organizationId !== targetUser.organizationId) {
          return res.status(403).json({ message: "Cannot update users from other organizations" });
        }
      }

      // Use target user's organization for tag validation
      const targetOrgId = targetUser.organizationId;
      if (!targetOrgId) {
        return res.status(400).json({ message: "Target user must belong to an organization" });
      }

      const { tagIds, primaryTagId } = req.body;
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: "tagIds must be an array" });
      }

      // Verify all tag IDs belong to the TARGET user's organization
      if (tagIds.length > 0) {
        const orgTags = await storage.getTeamTagsByOrganization(targetOrgId);
        const validTagIds = new Set(orgTags.map(t => t.id));
        for (const tagId of tagIds) {
          if (!validTagIds.has(tagId)) {
            return res.status(400).json({ message: `Invalid team tag ID: ${tagId}` });
          }
        }
        // Verify primaryTagId if provided
        if (primaryTagId && !validTagIds.has(primaryTagId)) {
          return res.status(400).json({ message: `Invalid primary team tag ID: ${primaryTagId}` });
        }
      }

      const updatedTags = await storage.setUserTeamTags(req.params.id, tagIds, targetOrgId, primaryTagId);
      res.json(updatedTags);
    } catch (error) {
      logger.error("Failed to update user team tags", error);
      res.status(500).json({ message: "Failed to update user team tags" });
    }
  });

  // Set user's primary team
  app.put("/api/users/:id/primary-team", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      // Only administrators can update user's primary team
      if (currentUser.role !== 'administrator' && currentUser.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can update user's primary team" });
      }

      // Verify target user exists
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Super admins can update any user; regular admins must be in the same organization
      if (currentUser.isSuperAdmin !== 'true') {
        if (!currentUser.organizationId) {
          return res.status(403).json({ message: "User must belong to an organization" });
        }
        if (currentUser.organizationId !== targetUser.organizationId) {
          return res.status(403).json({ message: "Cannot update users from other organizations" });
        }
      }

      const targetOrgId = targetUser.organizationId;
      if (!targetOrgId) {
        return res.status(400).json({ message: "Target user must belong to an organization" });
      }

      const { teamTagId } = req.body;
      if (!teamTagId || typeof teamTagId !== 'string') {
        return res.status(400).json({ message: "teamTagId is required" });
      }

      // Verify the team tag belongs to the organization
      const orgTags = await storage.getTeamTagsByOrganization(targetOrgId);
      if (!orgTags.some(t => t.id === teamTagId)) {
        return res.status(400).json({ message: "Invalid team tag ID" });
      }

      // Verify user is assigned to this team
      const userTags = await storage.getUserTeamTags(req.params.id, targetOrgId);
      if (!userTags.some(t => t.teamTagId === teamTagId)) {
        return res.status(400).json({ message: "User is not assigned to this team" });
      }

      await storage.setUserPrimaryTeam(req.params.id, teamTagId, targetOrgId);
      
      // Return updated tags
      const updatedTags = await storage.getUserTeamTags(req.params.id, targetOrgId);
      res.json(updatedTags);
    } catch (error) {
      logger.error("Failed to update user's primary team", error);
      res.status(500).json({ message: "Failed to update user's primary team" });
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
      
      // All users see only strategies in their organization
      if (user.role === 'administrator' || user.isSuperAdmin === 'true') {
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
        if ((strategy.status?.toLowerCase() === 'archived' || strategy.status?.toLowerCase() === 'completed') && 
            oldStrategy.status?.toLowerCase() !== 'archived' && oldStrategy.status?.toLowerCase() !== 'completed') {
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
      let projects: any[] = [];
      
      // First get the base set of projects based on organization and role
      // All users (including Super Admins) are scoped to their organization for main views
      if (user.organizationId) {
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
      
      // Derive organizationId from strategy if user doesn't have one (e.g., super-admin)
      let projectOrgId = user.organizationId;
      if (!projectOrgId) {
        const strategy = await storage.getStrategy(validatedData.strategyId);
        projectOrgId = strategy?.organizationId || null;
      }
      
      const project = await storage.createProject({
        ...validatedData,
        organizationId: projectOrgId,
      });

      // Recalculate parent strategy progress when a project is created
      await storage.recalculateStrategyProgress(project.strategyId);

      // Auto-create resource assignments for accountableLeaders (unified access + capacity)
      try {
        const leaderIds: string[] = JSON.parse(project.accountableLeaders || '[]');
        // Use project's organizationId (derived from user on creation) to ensure consistency
        const orgId = project.organizationId || user.organizationId;
        
        // Only proceed if we have a valid organization ID
        if (orgId) {
          for (const leaderId of leaderIds) {
            await storage.upsertProjectResourceAssignment({
              projectId: project.id,
              userId: leaderId,
              hoursPerWeek: '0',
              organizationId: orgId,
              assignedBy: userId,
            });
          }
        }
      } catch (syncError) {
        logger.error("Failed to create resource assignments for new project", syncError);
        // Don't fail the request if sync fails
      }

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

      // Sync accountableLeaders with resource assignments (unified access + capacity)
      // Note: We only ADD new leaders to resources, never DELETE existing ones
      // This preserves legitimate capacity-only entries (contractors, etc.)
      try {
        const newLeaderIds: string[] = JSON.parse(project.accountableLeaders || '[]');
        const existingAssignments = await storage.getProjectResourceAssignments(project.id);
        const existingUserIds = existingAssignments.map(a => a.userId);
        const orgId = project.organizationId || user.organizationId;
        
        // Only proceed if we have a valid organization ID
        if (orgId) {
          // Add resource assignments for new leaders (with 0 hours)
          for (const leaderId of newLeaderIds) {
            if (!existingUserIds.includes(leaderId)) {
              await storage.upsertProjectResourceAssignment({
                projectId: project.id,
                userId: leaderId,
                hoursPerWeek: '0',
                organizationId: orgId,
                assignedBy: userId,
              });
            }
          }
        }
        // Note: We do NOT delete resource assignments when removing from accountableLeaders
        // This allows capacity planning entries to persist independently of access control
      } catch (syncError) {
        logger.error("Failed to sync resource assignments with accountable leaders", syncError);
        // Don't fail the request if sync fails
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

  // Project Archive routes
  app.get("/api/archived-projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.organizationId && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "User must belong to an organization" });
      }

      const organizationId = user.organizationId || '';
      const archivedProjects = await storage.getArchivedProjectsByOrganization(organizationId);
      
      // Filter by strategy access for non-admin users
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const filteredProjects = archivedProjects.filter(p => assignedStrategyIds.includes(p.strategyId));
        return res.json(filteredProjects);
      }

      res.json(archivedProjects);
    } catch (error) {
      logger.error("Failed to get archived projects", error);
      res.status(500).json({ message: "Failed to get archived projects" });
    }
  });

  app.post("/api/projects/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // View role cannot archive projects
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot archive projects" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify organization access
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
      }

      // Check strategy access for non-admin users
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }

      const { reason, wakeUpDate } = req.body;
      const archivedProject = await storage.archiveProject(
        req.params.id,
        userId,
        reason,
        wakeUpDate ? new Date(wakeUpDate) : undefined
      );

      if (!archivedProject) {
        return res.status(500).json({ message: "Failed to archive project" });
      }

      // Recalculate strategy progress
      await storage.recalculateStrategyProgress(archivedProject.strategyId);

      res.json(archivedProject);
    } catch (error) {
      logger.error("Failed to archive project", error);
      res.status(500).json({ message: "Failed to archive project" });
    }
  });

  app.post("/api/projects/:id/unarchive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // View role cannot unarchive projects
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot restore projects" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify organization access
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
      }

      // Check strategy access for non-admin users
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }

      const restoredProject = await storage.unarchiveProject(req.params.id, userId);

      if (!restoredProject) {
        return res.status(500).json({ message: "Failed to restore project" });
      }

      // Recalculate strategy progress
      await storage.recalculateStrategyProgress(restoredProject.strategyId);

      res.json(restoredProject);
    } catch (error) {
      logger.error("Failed to restore project", error);
      res.status(500).json({ message: "Failed to restore project" });
    }
  });

  app.post("/api/projects/:id/copy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // View role cannot copy projects
      if (user.role === 'view') {
        return res.status(403).json({ message: "Forbidden: View users cannot copy projects" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify organization access
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
      }

      // Check strategy access for non-admin users
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        if (!assignedStrategyIds.includes(project.strategyId)) {
          return res.status(403).json({ message: "Forbidden: You do not have access to this strategy" });
        }
      }

      const { newTitle, asTemplate } = req.body;
      if (!newTitle) {
        return res.status(400).json({ message: "New title is required" });
      }

      const newProject = await storage.copyProject(req.params.id, newTitle, userId, asTemplate === true);

      if (!newProject) {
        return res.status(500).json({ message: "Failed to copy project" });
      }

      // Recalculate strategy progress for the new project
      await storage.recalculateStrategyProgress(newProject.strategyId);

      res.json(newProject);
    } catch (error) {
      logger.error("Failed to copy project", error);
      res.status(500).json({ message: "Failed to copy project" });
    }
  });

  app.get("/api/projects/:id/snapshots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify organization access
      if (user.isSuperAdmin !== 'true' && user.organizationId !== project.organizationId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
      }

      const snapshots = await storage.getProjectSnapshots(req.params.id);
      res.json(snapshots);
    } catch (error) {
      logger.error("Failed to get project snapshots", error);
      res.status(500).json({ message: "Failed to get project snapshots" });
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
      let activities: any[] = [];
      
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
      
      // All users (including Super Admins) see only actions in their organization for main views
      if (user.role === 'administrator' || user.isSuperAdmin === 'true') {
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
      
      let finalData = { ...validatedData, organizationId: user.organizationId };
      if (validatedData.projectId) {
        const project = await storage.getProject(validatedData.projectId);
        if (project && project.isWorkstream === 'true' && project.workstreamId) {
          finalData.workstreamId = project.workstreamId;
        }
      }

      const action = await storage.createAction(finalData);
      
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
      
      if (updateData.projectId && updateData.projectId !== oldAction.projectId) {
        const newProject = await storage.getProject(updateData.projectId);
        if (newProject && newProject.isWorkstream === 'true' && newProject.workstreamId) {
          updateData.workstreamId = newProject.workstreamId;
        }
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
      
      // Validate body without actionId, then merge actionId from URL params
      const validatedBody = insertActionChecklistItemSchema.parse(req.body);
      const item = await storage.createActionChecklistItem({
        ...validatedBody,
        actionId: req.params.actionId,
      });
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

  // Decision Log routes
  app.get("/api/decisions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role === 'sme') return res.status(403).json({ message: "Access denied" });

      const allDecisions = user.organizationId
        ? await storage.getDecisionsByOrganization(user.organizationId)
        : [];

      if (user.role === 'administrator' || user.isSuperAdmin === 'true') {
        res.json(allDecisions);
      } else {
        const assignedStrategyIds = await storage.getUserAssignedStrategyIds(userId);
        const filtered = allDecisions.filter(d =>
          !d.strategyId || assignedStrategyIds.includes(d.strategyId)
        );
        res.json(filtered);
      }
    } catch (error) {
      logger.error("Failed to fetch decisions", error);
      res.status(500).json({ message: "Failed to fetch decisions" });
    }
  });

  app.get("/api/decisions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const decision = await storage.getDecision(req.params.id);
      if (!decision) return res.status(404).json({ message: "Decision not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== decision.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const raciAssignments = await storage.getDecisionRaciAssignments(decision.id);
      res.json({ ...decision, raciAssignments });
    } catch (error) {
      logger.error("Failed to fetch decision", error);
      res.status(500).json({ message: "Failed to fetch decision" });
    }
  });

  app.post("/api/decisions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (!user.organizationId) return res.status(400).json({ message: "User has no organization" });
      if (user.role === 'sme' || user.role === 'view') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { raciAssignments, ...decisionData } = req.body;
      const parsed = insertDecisionSchema.parse(decisionData);
      const decision = await storage.createDecision({
        ...parsed,
        createdBy: userId,
        organizationId: user.organizationId,
      });

      if (raciAssignments && Array.isArray(raciAssignments) && raciAssignments.length > 0) {
        await storage.setDecisionRaciAssignments(decision.id, raciAssignments);
      }

      const finalDecision = await storage.getDecision(decision.id);
      const finalRaci = await storage.getDecisionRaciAssignments(decision.id);
      res.status(201).json({ ...finalDecision, raciAssignments: finalRaci });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      logger.error("Failed to create decision", error);
      res.status(500).json({ message: "Failed to create decision" });
    }
  });

  app.patch("/api/decisions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role === 'sme' || user.role === 'view') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const existing = await storage.getDecision(req.params.id);
      if (!existing) return res.status(404).json({ message: "Decision not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { raciAssignments, ...updates } = req.body;
      const decision = await storage.updateDecision(req.params.id, updates);

      if (raciAssignments && Array.isArray(raciAssignments)) {
        await storage.setDecisionRaciAssignments(req.params.id, raciAssignments);
      }

      const finalRaci = await storage.getDecisionRaciAssignments(req.params.id);
      res.json({ ...decision, raciAssignments: finalRaci });
    } catch (error) {
      logger.error("Failed to update decision", error);
      res.status(500).json({ message: "Failed to update decision" });
    }
  });

  app.delete("/api/decisions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can delete decisions" });
      }

      const existing = await storage.getDecision(req.params.id);
      if (!existing) return res.status(404).json({ message: "Decision not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteDecision(req.params.id);
      if (!deleted) return res.status(500).json({ message: "Failed to delete decision" });
      res.json({ message: "Decision deleted" });
    } catch (error) {
      logger.error("Failed to delete decision", error);
      res.status(500).json({ message: "Failed to delete decision" });
    }
  });

  // ==================== WORKSTREAM ROUTES ====================

  app.get("/api/workstreams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const strategyId = req.query.strategyId as string;
      if (!strategyId) return res.status(400).json({ message: "strategyId is required" });

      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const workstreams = await storage.getWorkstreamsByStrategy(strategyId);
      res.json(workstreams);
    } catch (error) {
      logger.error("Failed to fetch workstreams", error);
      res.status(500).json({ message: "Failed to fetch workstreams" });
    }
  });

  app.get("/api/workstreams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const workstream = await storage.getWorkstream(req.params.id);
      if (!workstream) return res.status(404).json({ message: "Workstream not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== workstream.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(workstream);
    } catch (error) {
      logger.error("Failed to fetch workstream", error);
      res.status(500).json({ message: "Failed to fetch workstream" });
    }
  });

  app.post("/api/workstreams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (!user.organizationId) return res.status(400).json({ message: "User has no organization" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const parsed = insertWorkstreamSchema.parse(req.body);
      const strategy = await storage.getStrategy(parsed.strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const workstream = await storage.createWorkstream({
        ...parsed,
        organizationId: user.organizationId,
      });

      await storage.createProject({
        title: workstream.name,
        description: `ERP workstream project for ${workstream.name}`,
        strategyId: parsed.strategyId,
        accountableLeaders: "[]",
        startDate: new Date(),
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: "IP",
        isWorkstream: "true",
        workstreamId: workstream.id,
        documentFolderUrl: null,
        communicationUrl: null,
        createdBy: userId,
        organizationId: user.organizationId,
      });

      res.status(201).json(workstream);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      logger.error("Failed to create workstream", error);
      res.status(500).json({ message: "Failed to create workstream" });
    }
  });

  app.patch("/api/workstreams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const existing = await storage.getWorkstream(req.params.id);
      if (!existing) return res.status(404).json({ message: "Workstream not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const workstream = await storage.updateWorkstream(req.params.id, req.body);

      if (req.body.name && req.body.name !== existing.name) {
        const allProjects = await storage.getProjectsByOrganization(existing.organizationId);
        const linkedProjects = allProjects.filter(
          (p: any) => p.isWorkstream === 'true' && (
            p.workstreamId === req.params.id ||
            (p.title === existing.name && p.strategyId === existing.strategyId)
          )
        );
        for (const proj of linkedProjects) {
          const updates: any = { title: req.body.name };
          if (proj.workstreamId !== req.params.id) {
            updates.workstreamId = req.params.id;
          }
          await storage.updateProject(proj.id, updates);
        }
      }

      res.json(workstream);
    } catch (error) {
      logger.error("Failed to update workstream", error);
      res.status(500).json({ message: "Failed to update workstream" });
    }
  });

  app.delete("/api/workstreams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can delete workstreams" });
      }

      const existing = await storage.getWorkstream(req.params.id);
      if (!existing) return res.status(404).json({ message: "Workstream not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const wsActions = await storage.getWorkstreamActionsByStrategy(existing.strategyId);
      for (const act of wsActions) {
        if (act.workstreamId === req.params.id) {
          await storage.updateAction(act.id, { workstreamId: null, phaseId: null });
        }
      }

      const allProjects = await storage.getProjectsByOrganization(existing.organizationId);
      const linkedProjects = allProjects.filter(
        (p: any) => p.isWorkstream === 'true' && (
          p.workstreamId === req.params.id ||
          (p.title === existing.name && p.strategyId === existing.strategyId)
        )
      );
      for (const proj of linkedProjects) {
        await storage.deleteProject(proj.id);
      }

      const deleted = await storage.deleteWorkstream(req.params.id);
      if (!deleted) return res.status(500).json({ message: "Failed to delete workstream" });
      res.json({ message: "Workstream deleted" });
    } catch (error) {
      logger.error("Failed to delete workstream", error);
      res.status(500).json({ message: "Failed to delete workstream" });
    }
  });

  // ==================== PHASE ROUTES ====================

  app.get("/api/phases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const strategyId = req.query.strategyId as string;
      if (strategyId) {
        const strategy = await storage.getStrategy(strategyId);
        if (!strategy) return res.status(404).json({ message: "Strategy not found" });
        if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
          return res.status(403).json({ message: "Access denied" });
        }
        const result = await storage.getPhasesByStrategy(strategyId);
        return res.json(result);
      }

      if (!user.organizationId) return res.status(400).json({ message: "User has no organization" });
      const allPhases = await storage.getPhasesByOrganization(user.organizationId);
      res.json(allPhases);
    } catch (error) {
      logger.error("Failed to fetch phases", error);
      res.status(500).json({ message: "Failed to fetch phases" });
    }
  });

  app.get("/api/phases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const phase = await storage.getPhase(req.params.id);
      if (!phase) return res.status(404).json({ message: "Phase not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== phase.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(phase);
    } catch (error) {
      logger.error("Failed to fetch phase", error);
      res.status(500).json({ message: "Failed to fetch phase" });
    }
  });

  app.post("/api/phases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (!user.organizationId) return res.status(400).json({ message: "User has no organization" });
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can create phases" });
      }

      const parsed = insertPhaseSchema.parse(req.body);
      const strategy = await storage.getStrategy(parsed.strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const phase = await storage.createPhase({
        ...parsed,
        organizationId: user.organizationId,
      });
      res.status(201).json(phase);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      logger.error("Failed to create phase", error);
      res.status(500).json({ message: "Failed to create phase" });
    }
  });

  app.patch("/api/phases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can update phases" });
      }

      const existing = await storage.getPhase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Phase not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const phase = await storage.updatePhase(req.params.id, req.body);
      res.json(phase);
    } catch (error) {
      logger.error("Failed to update phase", error);
      res.status(500).json({ message: "Failed to update phase" });
    }
  });

  app.delete("/api/phases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can delete phases" });
      }

      const existing = await storage.getPhase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Phase not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deletePhase(req.params.id);
      if (!deleted) return res.status(500).json({ message: "Failed to delete phase" });
      res.json({ message: "Phase deleted" });
    } catch (error) {
      logger.error("Failed to delete phase", error);
      res.status(500).json({ message: "Failed to delete phase" });
    }
  });

  // ==================== WORKSTREAM TASK ROUTES ====================

  app.get("/api/workstream-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const strategyId = req.query.strategyId as string;
      const workstreamId = req.query.workstreamId as string;
      const phaseId = req.query.phaseId as string;

      if (!strategyId) return res.status(400).json({ message: "strategyId is required" });

      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let tasks = await storage.getWorkstreamActionsByStrategy(strategyId);

      if (workstreamId) {
        tasks = tasks.filter(t => t.workstreamId === workstreamId);
      }
      if (phaseId) {
        tasks = tasks.filter(t => t.phaseId === phaseId);
      }

      const mapped = tasks.map(a => ({
        ...a,
        name: a.title,
        owner: null,
      }));

      res.json(mapped);
    } catch (error) {
      logger.error("Failed to fetch workstream tasks", error);
      res.status(500).json({ message: "Failed to fetch workstream tasks" });
    }
  });

  app.get("/api/workstream-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const action = await storage.getAction(req.params.id);
      if (!action || !action.workstreamId) return res.status(404).json({ message: "Task not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== action.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ ...action, name: action.title, owner: null });
    } catch (error) {
      logger.error("Failed to fetch workstream task", error);
      res.status(500).json({ message: "Failed to fetch workstream task" });
    }
  });

  app.post("/api/workstream-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (!user.organizationId) return res.status(400).json({ message: "User has no organization" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { name, workstreamId, phaseId, ...rest } = req.body;

      const workstream = await storage.getWorkstream(workstreamId);
      if (!workstream) return res.status(404).json({ message: "Workstream not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== workstream.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const strategy = await storage.getStrategy(workstream.strategyId);
      const action = await storage.createAction({
        title: name || rest.title || "Untitled Task",
        description: rest.description || "",
        strategyId: workstream.strategyId,
        projectId: rest.projectId || null,
        workstreamId,
        phaseId: phaseId || null,
        documentFolderUrl: null,
        isMilestone: rest.isMilestone || "false",
        milestoneType: rest.milestoneType || null,
        status: rest.status || "in_progress",
        durationDays: rest.durationDays || 1,
        percentComplete: rest.percentComplete || 0,
        sortOrder: rest.sortOrder || 0,
        plannedStart: rest.plannedStart || null,
        plannedEnd: rest.plannedEnd || null,
        createdBy: userId,
        organizationId: user.organizationId,
      });
      res.status(201).json({ ...action, name: action.title, owner: null });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      logger.error("Failed to create workstream task", error);
      res.status(500).json({ message: "Failed to create workstream task" });
    }
  });

  app.patch("/api/workstream-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const existing = await storage.getAction(req.params.id);
      if (!existing || !existing.workstreamId) return res.status(404).json({ message: "Task not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, ...rest } = req.body;
      const updates: any = { ...rest };
      if (name !== undefined) updates.title = name;

      const action = await storage.updateAction(req.params.id, updates);
      res.json(action ? { ...action, name: action.title, owner: null } : action);
    } catch (error) {
      logger.error("Failed to update workstream task", error);
      res.status(500).json({ message: "Failed to update workstream task" });
    }
  });

  app.delete("/api/workstream-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const existing = await storage.getAction(req.params.id);
      if (!existing || !existing.workstreamId) return res.status(404).json({ message: "Task not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteAction(req.params.id);
      if (!deleted) return res.status(500).json({ message: "Failed to delete task" });
      res.json({ message: "Task deleted" });
    } catch (error) {
      logger.error("Failed to delete workstream task", error);
      res.status(500).json({ message: "Failed to delete workstream task" });
    }
  });

  // ==================== WORKSTREAM DEPENDENCY ROUTES ====================

  app.get("/api/workstream-dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const strategyId = req.query.strategyId as string;
      if (!strategyId) return res.status(400).json({ message: "strategyId is required" });

      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dependencies = await storage.getWorkstreamDependenciesByStrategy(strategyId);
      res.json(dependencies);
    } catch (error) {
      logger.error("Failed to fetch workstream dependencies", error);
      res.status(500).json({ message: "Failed to fetch workstream dependencies" });
    }
  });

  app.post("/api/workstream-dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const parsed = insertWorkstreamDependencySchema.parse(req.body);

      const predecessorTask = await storage.getAction(parsed.predecessorTaskId);
      if (!predecessorTask) return res.status(404).json({ message: "Predecessor task not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== predecessorTask.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dependency = await storage.createWorkstreamDependency(parsed);
      res.status(201).json(dependency);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      logger.error("Failed to create workstream dependency", error);
      res.status(500).json({ message: "Failed to create workstream dependency" });
    }
  });

  app.delete("/api/workstream-dependencies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const deleted = await storage.deleteWorkstreamDependency(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Dependency not found" });
      res.json({ message: "Dependency deleted" });
    } catch (error) {
      logger.error("Failed to delete workstream dependency", error);
      res.status(500).json({ message: "Failed to delete workstream dependency" });
    }
  });

  // ==================== GATE CRITERIA ROUTES ====================

  app.get("/api/gate-criteria", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const gateTaskId = req.query.gateTaskId as string;
      if (!gateTaskId) return res.status(400).json({ message: "gateTaskId is required" });

      const action = await storage.getAction(gateTaskId);
      const task = action;
      if (!task) return res.status(404).json({ message: "Gate task not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== task.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const criteria = await storage.getGateCriteriaByTask(gateTaskId);
      res.json(criteria);
    } catch (error) {
      logger.error("Failed to fetch gate criteria", error);
      res.status(500).json({ message: "Failed to fetch gate criteria" });
    }
  });

  app.post("/api/gate-criteria", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const parsed = insertGateCriteriaSchema.parse(req.body);

      const action = await storage.getAction(parsed.gateTaskId);
      const task = action;
      if (!task) return res.status(404).json({ message: "Gate task not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== task.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const criteria = await storage.createGateCriteria(parsed);
      res.status(201).json(criteria);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      logger.error("Failed to create gate criteria", error);
      res.status(500).json({ message: "Failed to create gate criteria" });
    }
  });

  app.patch("/api/gate-criteria/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const existing = await storage.getGateCriteriaByTask(req.params.id);
      const criteriaItem = (await storage.updateGateCriteria(req.params.id, req.body));
      if (!criteriaItem) return res.status(404).json({ message: "Gate criteria not found" });

      res.json(criteriaItem);
    } catch (error) {
      logger.error("Failed to update gate criteria", error);
      res.status(500).json({ message: "Failed to update gate criteria" });
    }
  });

  app.delete("/api/gate-criteria/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.role !== 'administrator' && user.role !== 'co_lead' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const deleted = await storage.deleteGateCriteria(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Gate criteria not found" });
      res.json({ message: "Gate criteria deleted" });
    } catch (error) {
      logger.error("Failed to delete gate criteria", error);
      res.status(500).json({ message: "Failed to delete gate criteria" });
    }
  });

  // ==================== SEED ERP PROGRAM ====================

  app.post("/api/workstreams/seed-program", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (!user.organizationId) return res.status(400).json({ message: "User has no organization" });
      if (user.role !== 'administrator' && user.isSuperAdmin !== 'true') {
        return res.status(403).json({ message: "Only administrators can seed programs" });
      }

      const { strategyId } = req.body;
      if (!strategyId) return res.status(400).json({ message: "strategyId is required" });

      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const defaultWorkstreamNames = [
        "HCM & Payroll",
        "Finance & Grants",
        "Supply Chain",
        "Integrations",
        "Data Conversion",
        "Reporting & Analytics",
        "Security & Access",
        "Technical Infrastructure",
        "OCM/Communications & Training",
        "Program Management & Governance",
      ];

      const defaultPhaseNames = [
        "Mobilize & Staff",
        "Prepare & Plan",
        "Architect & Design",
        "Build & Configure",
        "Test & Validate",
        "Deploy & Cutover",
        "Stabilize & Optimize",
      ];

      const createdWorkstreams = [];
      for (let i = 0; i < defaultWorkstreamNames.length; i++) {
        const ws = await storage.createWorkstream({
          strategyId,
          name: defaultWorkstreamNames[i],
          sortOrder: i + 1,
          status: "active",
          organizationId: user.organizationId,
        });
        createdWorkstreams.push(ws);
      }

      const createdPhases = [];
      for (let i = 0; i < defaultPhaseNames.length; i++) {
        const phase = await storage.createPhase({
          strategyId,
          name: defaultPhaseNames[i],
          sequence: i + 1,
          organizationId: user.organizationId,
        });
        createdPhases.push(phase);
      }

      const createdProjects = [];
      for (const ws of createdWorkstreams) {
        const project = await storage.createProject({
          title: ws.name,
          description: `ERP workstream project for ${ws.name}`,
          strategyId,
          accountableLeaders: "[]",
          startDate: new Date(),
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "IP",
          isWorkstream: "true",
          workstreamId: ws.id,
          documentFolderUrl: null,
          communicationUrl: null,
          createdBy: userId,
          organizationId: user.organizationId,
        });
        createdProjects.push(project);
      }

      const pmGovernanceWorkstream = createdWorkstreams.find(
        ws => ws.name === "Program Management & Governance"
      );

      const createdGates = [];
      const createdCriteria = [];
      if (pmGovernanceWorkstream) {
        const gateCriteriaByPhase: Record<string, string[]> = {
          "Mobilize & Staff": [
            "All workstream leads identified and assigned",
            "Program charter approved by steering committee",
            "Resource plan finalized with committed FTEs",
            "Governance structure and escalation paths defined",
          ],
          "Prepare & Plan": [
            "Detailed project plan baselined with milestones",
            "Business process scope and fit-gap analysis complete",
            "Data migration strategy documented and approved",
            "Change management and communications plan finalized",
            "Risk register reviewed and mitigations assigned",
          ],
          "Architect & Design": [
            "All functional design documents (FDDs) signed off",
            "Technical architecture blueprint approved",
            "Integration specifications documented for all interfaces",
            "Security and access model designed and reviewed",
            "Reporting requirements mapped to solution capabilities",
          ],
          "Build & Configure": [
            "System configuration complete per approved FDDs",
            "Unit testing passed for all configured modules",
            "Data conversion programs developed and unit tested",
            "Integration interfaces built and connectivity verified",
            "Training environment provisioned and validated",
          ],
          "Test & Validate": [
            "Zero P1 defects open at gate review",
            "System integration testing (SIT) cycles complete with sign-off",
            "User acceptance testing (UAT) passed by business owners",
            "Performance and load testing results within thresholds",
            "Data migration dry run executed with reconciliation complete",
          ],
          "Deploy & Cutover": [
            "Go/No-Go decision approved by executive committee",
            "Cutover checklist 100% complete with verification",
            "End-user training delivered and attendance confirmed",
            "Hypercare support team staffed and schedule published",
            "Production environment smoke-tested and operational",
          ],
          "Stabilize & Optimize": [
            "All critical P1/P2 defects resolved post go-live",
            "Business process performance metrics baselined",
            "Knowledge transfer to BAU support team complete",
            "Lessons learned documented and reviewed",
            "Transition to steady-state support model confirmed",
          ],
        };

        for (const phase of createdPhases) {
          const pmProject = createdProjects.find(
            (p: any) => p.workstreamId === pmGovernanceWorkstream.id
          );
          const gate = await storage.createAction({
            title: `${phase.name} Gate`,
            description: `Program gate milestone for ${phase.name} phase`,
            strategyId,
            projectId: pmProject?.id || null,
            workstreamId: pmGovernanceWorkstream.id,
            phaseId: phase.id,
            isMilestone: "true",
            milestoneType: "program_gate",
            status: "in_progress",
            durationDays: 1,
            percentComplete: 0,
            sortOrder: phase.sequence ?? 0,
            documentFolderUrl: null,
            createdBy: userId,
            organizationId: user.organizationId,
          });
          createdGates.push(gate);

          const criteriaDescriptions = gateCriteriaByPhase[phase.name] || [];
          for (const desc of criteriaDescriptions) {
            const criterion = await storage.createGateCriteria({
              gateTaskId: gate.id,
              description: desc,
              isMet: "false",
            });
            createdCriteria.push(criterion);
          }
        }
      }

      res.status(201).json({
        workstreams: createdWorkstreams,
        phases: createdPhases,
        programGates: createdGates,
        gateCriteria: createdCriteria,
        projects: createdProjects,
      });
    } catch (error) {
      logger.error("Failed to seed ERP program", error);
      res.status(500).json({ message: "Failed to seed ERP program" });
    }
  });

  // ==================== WORKSTREAM CALCULATIONS (RAG + CRITICAL PATH) ====================

  app.get("/api/workstream-calculations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const strategyId = req.query.strategyId as string;
      if (!strategyId) return res.status(400).json({ message: "strategyId is required" });

      const strategy = await storage.getStrategy(strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });
      if (user.isSuperAdmin !== 'true' && user.organizationId !== strategy.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const [tasks, workstreams, phases, dependencies] = await Promise.all([
        storage.getWorkstreamActionsByStrategy(strategyId),
        storage.getWorkstreamsByStrategy(strategyId),
        storage.getPhasesByStrategy(strategyId),
        storage.getWorkstreamDependenciesByStrategy(strategyId),
      ]);

      const BUFFER_DAYS = 5;
      const now = new Date();

      const taskRag: Record<string, { rag: string; task: any }> = {};
      for (const task of tasks) {
        let rag = "GREEN";
        if (task.status === "complete" || task.status === "completed") {
          rag = "COMPLETE";
        } else if (task.status === "blocked") {
          rag = "RED";
        } else {
          const plannedEnd = task.plannedEnd ? new Date(task.plannedEnd) : null;
          if (plannedEnd) {
            const daysRemaining = Math.ceil((plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const pctLeft = 100 - (task.percentComplete || 0);
            const daysOfWorkRemaining = Math.ceil((pctLeft / 100) * (task.durationDays || 1));
            if (daysRemaining < daysOfWorkRemaining) {
              rag = "RED";
            } else if (daysRemaining < daysOfWorkRemaining + BUFFER_DAYS) {
              rag = "AMBER";
            }
          }
        }
        taskRag[task.id] = { rag, task };
      }

      const workstreamGateRag: Record<string, Record<string, string>> = {};
      for (const ws of workstreams) {
        workstreamGateRag[ws.id] = {};
        for (const phase of phases) {
          const phaseTasks = tasks.filter(t => t.workstreamId === ws.id && t.phaseId === phase.id);
          if (phaseTasks.length === 0) {
            workstreamGateRag[ws.id][phase.id] = "NONE";
          } else {
            const rags = phaseTasks.map(t => taskRag[t.id]?.rag || "GREEN");
            if (rags.includes("RED")) {
              workstreamGateRag[ws.id][phase.id] = "RED";
            } else if (rags.includes("AMBER")) {
              workstreamGateRag[ws.id][phase.id] = "AMBER";
            } else if (rags.every(r => r === "COMPLETE")) {
              workstreamGateRag[ws.id][phase.id] = "COMPLETE";
            } else {
              workstreamGateRag[ws.id][phase.id] = "GREEN";
            }
          }
        }
      }

      const programGateRag: Record<string, string> = {};
      for (const phase of phases) {
        const wsRags = workstreams.map(ws => workstreamGateRag[ws.id]?.[phase.id] || "GREEN");

        const gateTasks = tasks.filter(
          t => t.phaseId === phase.id && t.isMilestone === "true" && t.milestoneType === "program_gate"
        );
        const allCriteria: any[] = [];
        for (const gt of gateTasks) {
          const criteria = await storage.getGateCriteriaByTask(gt.id);
          allCriteria.push(...criteria);
        }
        const unmetCriteria = allCriteria.filter(c => c.isMet !== "true");

        const activeWsRags = wsRags.filter(r => r !== "NONE");
        if (activeWsRags.length === 0 && allCriteria.length === 0) {
          programGateRag[phase.id] = "NONE";
        } else if (activeWsRags.includes("RED") || unmetCriteria.length > 0) {
          programGateRag[phase.id] = "RED";
        } else if (activeWsRags.includes("AMBER")) {
          programGateRag[phase.id] = "AMBER";
        } else if (activeWsRags.length > 0 && activeWsRags.every(r => r === "COMPLETE") && allCriteria.length > 0 && unmetCriteria.length === 0) {
          programGateRag[phase.id] = "COMPLETE";
        } else if (activeWsRags.length === 0) {
          programGateRag[phase.id] = "NONE";
        } else {
          programGateRag[phase.id] = "GREEN";
        }
      }

      const taskMap = new Map(tasks.map(t => [t.id, t]));
      const successors = new Map<string, string[]>();
      const predecessors = new Map<string, string[]>();
      for (const dep of dependencies) {
        if (!successors.has(dep.predecessorTaskId)) successors.set(dep.predecessorTaskId, []);
        successors.get(dep.predecessorTaskId)!.push(dep.successorTaskId);
        if (!predecessors.has(dep.successorTaskId)) predecessors.set(dep.successorTaskId, []);
        predecessors.get(dep.successorTaskId)!.push(dep.predecessorTaskId);
      }

      const earlyStart: Record<string, number> = {};
      const earlyEnd: Record<string, number> = {};
      const lateStart: Record<string, number> = {};
      const lateEnd: Record<string, number> = {};

      const topoOrder: string[] = [];
      const inDegree: Record<string, number> = {};
      for (const t of tasks) {
        inDegree[t.id] = (predecessors.get(t.id) || []).length;
      }
      const queue: string[] = tasks.filter(t => inDegree[t.id] === 0).map(t => t.id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        topoOrder.push(current);
        for (const succ of (successors.get(current) || [])) {
          inDegree[succ]--;
          if (inDegree[succ] === 0) queue.push(succ);
        }
      }

      for (const taskId of topoOrder) {
        const t = taskMap.get(taskId)!;
        const preds = predecessors.get(taskId) || [];
        if (preds.length === 0) {
          earlyStart[taskId] = 0;
        } else {
          earlyStart[taskId] = Math.max(...preds.map(p => earlyEnd[p] || 0));
        }
        earlyEnd[taskId] = earlyStart[taskId] + (t.durationDays || 1);
      }

      const projectEnd = Math.max(...tasks.map(t => earlyEnd[t.id] || 0), 0);

      for (let i = topoOrder.length - 1; i >= 0; i--) {
        const taskId = topoOrder[i];
        const t = taskMap.get(taskId)!;
        const succs = successors.get(taskId) || [];
        if (succs.length === 0) {
          lateEnd[taskId] = projectEnd;
        } else {
          lateEnd[taskId] = Math.min(...succs.map(s => lateStart[s] ?? projectEnd));
        }
        lateStart[taskId] = lateEnd[taskId] - (t.durationDays || 1);
      }

      const criticalPath: Record<string, { earlyStart: number; earlyEnd: number; lateStart: number; lateEnd: number; totalFloat: number; isCritical: boolean }> = {};
      for (const taskId of topoOrder) {
        const float = (lateStart[taskId] ?? 0) - (earlyStart[taskId] ?? 0);
        criticalPath[taskId] = {
          earlyStart: earlyStart[taskId] ?? 0,
          earlyEnd: earlyEnd[taskId] ?? 0,
          lateStart: lateStart[taskId] ?? 0,
          lateEnd: lateEnd[taskId] ?? 0,
          totalFloat: float,
          isCritical: float === 0,
        };
      }

      res.json({
        taskRag: Object.fromEntries(
          Object.entries(taskRag).map(([id, v]) => [id, v.rag])
        ),
        workstreamGateRag,
        programGateRag,
        criticalPath,
        projectDurationDays: projectEnd,
      });
    } catch (error) {
      logger.error("Failed to calculate workstream data", error);
      res.status(500).json({ message: "Failed to calculate workstream data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
