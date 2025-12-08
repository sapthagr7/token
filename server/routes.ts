import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  authMiddleware, 
  adminMiddleware, 
  kycApprovedMiddleware, 
  generateToken, 
  hashPassword, 
  verifyPassword,
  type AuthenticatedRequest
} from "./auth";
import { 
  insertUserSchema, 
  loginSchema, 
  insertAssetSchema,
  mintTokensSchema,
  insertOrderSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, name, password } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = hashPassword(password);
      // Security: Public registration always creates INVESTOR with PENDING KYC and unfrozen
      // This prevents privilege escalation via client-supplied role/kycStatus/isFrozen
      const user = await storage.createUser({
        name,
        email,
        passwordHash,
        role: "INVESTOR",
        kycStatus: "PENDING",
        isFrozen: false,
      });

      const token = generateToken(user);
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user);
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  app.get("/api/users/me", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { passwordHash: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.get("/api/admin/users", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/stats", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/approve", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const user = await storage.updateUserKycStatus(req.params.id, "APPROVED");
      if (!user) return res.status(404).json({ error: "User not found" });
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/reject", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const user = await storage.updateUserKycStatus(req.params.id, "REJECTED");
      if (!user) return res.status(404).json({ error: "User not found" });
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/freeze", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const user = await storage.updateUserFrozenStatus(req.params.id, true);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/unfreeze", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const user = await storage.updateUserFrozenStatus(req.params.id, false);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assets", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const parsed = insertAssetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const asset = await storage.createAsset(parsed.data);
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tokens/mint", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = mintTokensSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { assetId, userId, amount } = parsed.data;

      const asset = await storage.getAsset(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });
      if (targetUser.kycStatus !== "APPROVED") {
        return res.status(400).json({ error: "User must have approved KYC to receive tokens" });
      }

      if (asset.remainingSupply < amount) {
        return res.status(400).json({ error: `Insufficient supply. Only ${asset.remainingSupply} tokens available.` });
      }

      let token = await storage.getTokenByAssetAndUser(assetId, userId);
      if (token) {
        token = await storage.updateTokenAmount(token.id, token.amount + amount);
      } else {
        token = await storage.createToken(assetId, userId, amount);
      }

      await storage.updateAssetRemainingSupply(assetId, asset.remainingSupply - amount);

      await storage.createTransfer({
        assetId,
        fromUserId: null,
        toUserId: userId,
        tokenAmount: amount,
        reason: "MINT",
      });

      res.status(201).json(token);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tokens/revoke", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { tokenId, amount } = req.body;
      if (!tokenId || !amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid token ID or amount" });
      }

      const token = await storage.getToken(tokenId);
      if (!token) return res.status(404).json({ error: "Token not found" });

      if (token.amount < amount) {
        return res.status(400).json({ error: "Amount exceeds token balance" });
      }

      const asset = await storage.getAsset(token.assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      if (token.amount === amount) {
        await storage.deleteToken(tokenId);
      } else {
        await storage.updateTokenAmount(tokenId, token.amount - amount);
      }

      await storage.updateAssetRemainingSupply(token.assetId, asset.remainingSupply + amount);

      await storage.createTransfer({
        assetId: token.assetId,
        fromUserId: token.ownerId,
        toUserId: null,
        tokenAmount: amount,
        reason: "ADMIN_REVOKE",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tokens/my-portfolio", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const tokens = await storage.getTokensByUser(req.user.id);
      res.json(tokens);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/tokens", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const tokens = await storage.getAllTokensWithDetails();
      res.json(tokens);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplace/orders", authMiddleware(storage), async (req, res) => {
    try {
      const orders = await storage.getOpenOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplace/my-orders", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const orders = await storage.getOrdersByUser(req.user.id);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplace/order", authMiddleware(storage), kycApprovedMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { assetId, tokenAmount, pricePerToken } = req.body;
      if (!assetId || !tokenAmount || !pricePerToken) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const token = await storage.getTokenByAssetAndUser(assetId, req.user.id);
      if (!token || token.amount < tokenAmount) {
        return res.status(400).json({ error: "Insufficient token balance" });
      }

      await storage.updateTokenAmount(token.id, token.amount - tokenAmount);

      const order = await storage.createOrder({
        sellerId: req.user.id,
        assetId,
        tokenAmount: parseInt(tokenAmount),
        pricePerToken: pricePerToken.toString(),
      });

      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplace/order/:id/fill", authMiddleware(storage), kycApprovedMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status !== "OPEN") return res.status(400).json({ error: "Order is not open" });
      if (order.sellerId === req.user.id) return res.status(400).json({ error: "Cannot buy your own order" });

      const seller = await storage.getUser(order.sellerId);
      if (!seller) return res.status(400).json({ error: "Seller not found" });
      if (seller.kycStatus !== "APPROVED" || seller.isFrozen) {
        return res.status(400).json({ error: "Seller is not eligible for this trade" });
      }

      let buyerToken = await storage.getTokenByAssetAndUser(order.assetId, req.user.id);
      if (buyerToken) {
        await storage.updateTokenAmount(buyerToken.id, buyerToken.amount + order.tokenAmount);
      } else {
        await storage.createToken(order.assetId, req.user.id, order.tokenAmount);
      }

      await storage.updateOrderStatus(order.id, "FILLED", req.user.id);

      await storage.createTransfer({
        assetId: order.assetId,
        fromUserId: order.sellerId,
        toUserId: req.user.id,
        tokenAmount: order.tokenAmount,
        reason: "TRADE",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplace/order/:id/cancel", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status !== "OPEN") return res.status(400).json({ error: "Order is not open" });
      if (order.sellerId !== req.user.id) return res.status(403).json({ error: "Not your order" });

      let token = await storage.getTokenByAssetAndUser(order.assetId, req.user.id);
      if (token) {
        await storage.updateTokenAmount(token.id, token.amount + order.tokenAmount);
      } else {
        await storage.createToken(order.assetId, req.user.id, order.tokenAmount);
      }

      await storage.updateOrderStatus(order.id, "CANCELLED");

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transfers", authMiddleware(storage), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transfers = await storage.getTransfers(limit);
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
