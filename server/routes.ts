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
  publicRegistrationSchema, 
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
      // Use publicRegistrationSchema to prevent privilege escalation
      // Only accepts name, email, password - ignores any role/kycStatus/isFrozen
      const parsed = publicRegistrationSchema.safeParse(req.body);
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
      
      // Send notification
      await storage.createNotification(
        user.id,
        "KYC_STATUS",
        "KYC Approved",
        "Congratulations! Your KYC verification has been approved. You can now trade on the platform."
      );
      
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
      
      // Send notification
      await storage.createNotification(
        user.id,
        "KYC_STATUS",
        "KYC Rejected",
        "Your KYC verification was not approved. Please contact support for more information."
      );
      
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
      
      // Send notification
      await storage.createNotification(
        user.id,
        "ACCOUNT_STATUS",
        "Account Frozen",
        "Your account has been frozen by an administrator. Please contact support for more information."
      );
      
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
      
      // Send notification
      await storage.createNotification(
        user.id,
        "ACCOUNT_STATUS",
        "Account Unfrozen",
        "Your account has been unfrozen. You may now resume trading activities."
      );
      
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

      // Record price history for charts
      await storage.createPriceHistory(
        order.assetId,
        order.pricePerToken,
        order.tokenAmount,
        order.id
      );

      // Get asset info for notifications
      const asset = await storage.getAsset(order.assetId);
      const assetTitle = asset?.title || "Unknown Asset";

      // Notify seller
      await storage.createNotification(
        order.sellerId,
        "ORDER_FILLED",
        "Order Filled",
        `Your sell order for ${order.tokenAmount} tokens of ${assetTitle} has been filled at $${order.pricePerToken} per token.`
      );

      // Notify buyer
      await storage.createNotification(
        req.user.id,
        "ORDER_FILLED",
        "Purchase Complete",
        `You have purchased ${order.tokenAmount} tokens of ${assetTitle} at $${order.pricePerToken} per token.`
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplace/order/:id/cancel", authMiddleware(storage), kycApprovedMiddleware, async (req: AuthenticatedRequest, res) => {
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

  // Admin-only: Full transfer ledger access
  app.get("/api/admin/transfers", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const allTransfers = await storage.getTransfers(limit);
      res.json(allTransfers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Price history and market data
  app.get("/api/market-data", authMiddleware(storage), async (req, res) => {
    try {
      const marketData = await storage.getAssetMarketData();
      res.json(marketData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/price-history/:assetId", authMiddleware(storage), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = await storage.getPriceHistory(req.params.assetId, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // KYC Documents
  app.get("/api/kyc/documents", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const documents = await storage.getKycDocuments(req.user.id);
      // Don't send file data in list view
      const docsWithoutData = documents.map(({ fileData, ...doc }) => doc);
      res.json(docsWithoutData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/kyc/documents", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const { documentType, fileName, fileData } = req.body;
      if (!documentType || !fileName || !fileData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!["id", "proof_of_address"].includes(documentType)) {
        return res.status(400).json({ error: "Invalid document type" });
      }

      const document = await storage.createKycDocument(req.user.id, documentType, fileName, fileData);
      const { fileData: _, ...docWithoutData } = document;
      res.status(201).json(docWithoutData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/kyc-documents", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const documents = await storage.getAllPendingDocuments();
      // Don't send full file data in list view
      const docsWithoutData = documents.map(({ fileData, ...doc }) => doc);
      res.json(docsWithoutData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/kyc-documents/:id", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const { status, reviewNotes } = req.body;
      if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const document = await storage.updateKycDocumentStatus(req.params.id, status, reviewNotes);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const { fileData, ...docWithoutData } = document;
      res.json(docWithoutData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications
  app.get("/api/notifications", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const notificationsList = await storage.getNotifications(req.user!.id);
      res.json(notificationsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications/unread-count", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/read-all", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Asset Analytics
  app.get("/api/analytics/asset/:id", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const analytics = await storage.getAssetAnalytics(req.params.id);
      if (!analytics) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // NAV History for an asset
  app.get("/api/analytics/asset/:id/nav-history", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const navHistoryData = await storage.getNavHistory(req.params.id, limit);
      res.json(navHistoryData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports - Admin-only transaction report
  app.get("/api/admin/reports/transactions", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { generateTransactionReport } = await import("./reports");
      const limit = parseInt(req.query.limit as string) || 500;
      const transfersList = await storage.getTransfers(limit);
      const report = generateTransactionReport(transfersList);
      
      res.setHeader("Content-Type", report.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
      res.send(report.content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/portfolio", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const { generatePortfolioReport } = await import("./reports");
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const tokensList = await storage.getTokensByUser(req.user.id);
      const report = generatePortfolioReport(req.user, tokensList);
      
      res.setHeader("Content-Type", report.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
      res.send(report.content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/tax", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const { generateTaxReport } = await import("./reports");
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      // Get all orders where user was buyer or seller and order was filled
      const allOrders = await storage.getOrdersByUser(req.user.id);
      const filledOrders = allOrders.filter(o => o.status === "FILLED");
      
      const report = generateTaxReport(req.user, filledOrders);
      
      res.setHeader("Content-Type", report.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
      res.send(report.content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/reports/compliance", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const { generateComplianceReport } = await import("./reports");
      
      const usersList = await storage.getAllUsers();
      const tokensList = await storage.getAllTokensWithDetails();
      const transfersList = await storage.getTransfers(1000);
      
      const report = generateComplianceReport(usersList, tokensList, transfersList);
      
      res.setHeader("Content-Type", report.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
      res.send(report.content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/asset/:id/price-history", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const { generatePriceHistoryReport } = await import("./reports");
      
      const asset = await storage.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      
      const priceHistoryData = await storage.getPriceHistory(req.params.id);
      const report = generatePriceHistoryReport(asset, priceHistoryData);
      
      res.setHeader("Content-Type", report.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
      res.send(report.content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update asset NAV (revaluation)
  app.post("/api/admin/assets/:id/nav", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { navPrice, reason } = req.body;
      if (!navPrice || isNaN(parseFloat(navPrice))) {
        return res.status(400).json({ error: "Valid navPrice is required" });
      }

      // Create NAV history entry
      const navEntry = await storage.createNavHistory(req.params.id, navPrice.toString(), reason || "revaluation");
      
      // Update the asset's current NAV
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // Note: We'll need to add an updateAssetNav method, for now just return the history
      res.status(201).json(navEntry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
