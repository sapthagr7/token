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
      const mintCostBasis = (parseFloat(asset.navPrice) * amount).toFixed(2);
      if (token) {
        const existingCostBasis = parseFloat(token.costBasis) || 0;
        const newCostBasis = (existingCostBasis + parseFloat(mintCostBasis)).toFixed(2);
        token = await storage.updateTokenCostBasis(token.id, newCostBasis, token.amount + amount);
      } else {
        token = await storage.createToken(assetId, userId, amount, mintCostBasis);
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

  app.get("/api/transactions/history", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transfers = await storage.getTransfersByUser(req.user.id);
      res.json(transfers);
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
      const orders = await storage.getApprovedOpenOrders();
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

      const existingCostBasis = parseFloat(token.costBasis) || 0;
      const costBasisPerToken = token.amount > 0 ? existingCostBasis / token.amount : 0;
      const newCostBasis = (costBasisPerToken * (token.amount - tokenAmount)).toFixed(2);
      await storage.updateTokenCostBasis(token.id, newCostBasis, token.amount - tokenAmount);

      const order = await storage.createOrder({
        sellerId: req.user.id,
        assetId,
        tokenAmount: parseInt(tokenAmount),
        pricePerToken: pricePerToken.toString(),
      });

      const asset = await storage.getAsset(assetId);
      const assetTitle = asset?.title || "Unknown Asset";

      const admins = await storage.getAllUsers();
      for (const admin of admins.filter(u => u.role === "ADMIN")) {
        await storage.createNotification(
          admin.id,
          "ORDER_APPROVAL",
          "New Sell Order Pending Approval",
          `${req.user.name} created a sell order for ${tokenAmount} tokens of ${assetTitle} at $${pricePerToken}/token. Please review.`
        );
      }

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
      if (order.approvalStatus !== "APPROVED") return res.status(400).json({ error: "Order is pending admin approval" });
      if (order.sellerId === req.user.id) return res.status(400).json({ error: "Cannot buy your own order" });

      const seller = await storage.getUser(order.sellerId);
      if (!seller) return res.status(400).json({ error: "Seller not found" });
      if (seller.kycStatus !== "APPROVED" || seller.isFrozen) {
        return res.status(400).json({ error: "Seller is not eligible for this trade" });
      }

      let buyerToken = await storage.getTokenByAssetAndUser(order.assetId, req.user.id);
      const tradeCostBasis = (parseFloat(order.pricePerToken) * order.tokenAmount).toFixed(2);
      if (buyerToken) {
        const existingCostBasis = parseFloat(buyerToken.costBasis) || 0;
        const newCostBasis = (existingCostBasis + parseFloat(tradeCostBasis)).toFixed(2);
        await storage.updateTokenCostBasis(buyerToken.id, newCostBasis, buyerToken.amount + order.tokenAmount);
      } else {
        await storage.createToken(order.assetId, req.user.id, order.tokenAmount, tradeCostBasis);
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

      const asset = await storage.getAsset(order.assetId);
      const returnedCostBasis = (parseFloat(asset?.navPrice || "0") * order.tokenAmount).toFixed(2);
      
      let token = await storage.getTokenByAssetAndUser(order.assetId, req.user.id);
      if (token) {
        const existingCostBasis = parseFloat(token.costBasis) || 0;
        const newCostBasis = (existingCostBasis + parseFloat(returnedCostBasis)).toFixed(2);
        await storage.updateTokenCostBasis(token.id, newCostBasis, token.amount + order.tokenAmount);
      } else {
        await storage.createToken(order.assetId, req.user.id, order.tokenAmount, returnedCostBasis);
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

  // Admin: View individual investor's transaction history
  app.get("/api/admin/users/:userId/transactions", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const transfers = await storage.getTransfersByUser(userId);
      res.json({ user: { id: user.id, name: user.name, email: user.email }, transfers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin order approval management
  app.get("/api/admin/pending-orders", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const orders = await storage.getPendingApprovalOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/orders/:id/approve", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status !== "OPEN") return res.status(400).json({ error: "Order is not open" });

      await storage.updateOrderApprovalStatus(order.id, "APPROVED");

      const seller = await storage.getUser(order.sellerId);
      const asset = await storage.getAsset(order.assetId);
      await storage.createNotification(
        order.sellerId,
        "ORDER_APPROVAL",
        "Sell Order Approved",
        `Your sell order for ${order.tokenAmount} tokens of ${asset?.title || "Unknown Asset"} has been approved and is now visible on the marketplace.`
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/orders/:id/reject", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status !== "OPEN") return res.status(400).json({ error: "Order is not open" });

      await storage.updateOrderApprovalStatus(order.id, "REJECTED");
      await storage.updateOrderStatus(order.id, "CANCELLED");

      const asset = await storage.getAsset(order.assetId);
      const returnedCostBasis = (parseFloat(asset?.navPrice || "0") * order.tokenAmount).toFixed(2);
      
      let token = await storage.getTokenByAssetAndUser(order.assetId, order.sellerId);
      if (token) {
        const existingCostBasis = parseFloat(token.costBasis) || 0;
        const newCostBasis = (existingCostBasis + parseFloat(returnedCostBasis)).toFixed(2);
        await storage.updateTokenCostBasis(token.id, newCostBasis, token.amount + order.tokenAmount);
      } else {
        await storage.createToken(order.assetId, order.sellerId, order.tokenAmount, returnedCostBasis);
      }

      await storage.createNotification(
        order.sellerId,
        "ORDER_APPROVAL",
        "Sell Order Rejected",
        `Your sell order for ${order.tokenAmount} tokens of ${asset?.title || "Unknown Asset"} has been rejected. Your tokens have been returned.`
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Token Request endpoints
  app.post("/api/marketplace/token-request", authMiddleware(storage), kycApprovedMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { assetId, amount } = req.body;
      if (!assetId || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const asset = await storage.getAsset(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      const tokenRequest = await storage.createTokenRequest({
        userId: req.user.id,
        assetId,
        amount: parseInt(amount),
      });

      const admins = await storage.getAllUsers();
      for (const admin of admins.filter(u => u.role === "ADMIN")) {
        await storage.createNotification(
          admin.id,
          "TOKEN_REQUEST",
          "New Token Request",
          `${req.user.name} requested ${amount} tokens of ${asset.title}. Please review.`
        );
      }

      res.status(201).json(tokenRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplace/my-token-requests", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const requests = await storage.getTokenRequests(req.user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/token-requests", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const requests = await storage.getPendingTokenRequests();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/token-requests/:id/approve", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const requests = await storage.getTokenRequests();
      const request = requests.find(r => r.id === id);
      
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "PENDING") return res.status(400).json({ error: "Request already processed" });

      const asset = await storage.getAsset(request.assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      if (asset.remainingSupply < request.amount) {
        return res.status(400).json({ error: "Insufficient remaining supply" });
      }

      const costBasis = (parseFloat(asset.navPrice) * request.amount).toFixed(2);
      let token = await storage.getTokenByAssetAndUser(request.assetId, request.userId);
      if (token) {
        const existingCostBasis = parseFloat(token.costBasis) || 0;
        const newCostBasis = (existingCostBasis + parseFloat(costBasis)).toFixed(2);
        await storage.updateTokenCostBasis(token.id, newCostBasis, token.amount + request.amount);
      } else {
        await storage.createToken(request.assetId, request.userId, request.amount, costBasis);
      }

      await storage.updateAssetRemainingSupply(asset.id, asset.remainingSupply - request.amount);
      await storage.updateTokenRequestStatus(id, "APPROVED");

      await storage.createTransfer({
        assetId: request.assetId,
        fromUserId: null,
        toUserId: request.userId,
        tokenAmount: request.amount,
        reason: "MINT",
      });

      await storage.createNotification(
        request.userId,
        "TOKEN_REQUEST",
        "Token Request Approved",
        `Your request for ${request.amount} tokens of ${asset.title} has been approved. The tokens are now in your portfolio.`
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/token-requests/:id/reject", authMiddleware(storage), adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const requests = await storage.getTokenRequests();
      const request = requests.find(r => r.id === id);
      
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "PENDING") return res.status(400).json({ error: "Request already processed" });

      await storage.updateTokenRequestStatus(id, "REJECTED", notes);

      const asset = await storage.getAsset(request.assetId);
      await storage.createNotification(
        request.userId,
        "TOKEN_REQUEST",
        "Token Request Rejected",
        `Your request for ${request.amount} tokens of ${asset?.title || "Unknown Asset"} has been rejected.${notes ? ` Reason: ${notes}` : ""}`
      );

      res.json({ success: true });
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

      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // Create NAV history entry
      await storage.createNavHistory(req.params.id, navPrice.toString(), reason || "revaluation");
      
      // Update the asset's current NAV price
      const updatedAsset = await storage.updateAssetNavPrice(req.params.id, navPrice.toString());

      res.status(200).json(updatedAsset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get token distribution for an asset
  app.get("/api/admin/assets/:id/tokens", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      const tokenDistribution = await storage.getTokensByAsset(req.params.id);
      res.json({ asset, tokens: tokenDistribution });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update user's token amount for an asset
  app.patch("/api/admin/tokens/:tokenId", authMiddleware(storage), adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount, reason } = req.body;
      if (amount === undefined || isNaN(parseInt(amount)) || parseInt(amount) < 0) {
        return res.status(400).json({ error: "Valid amount is required (0 or positive integer)" });
      }

      const token = await storage.getToken(req.params.tokenId);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }

      const asset = await storage.getAsset(token.assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      const oldAmount = token.amount;
      const newAmount = parseInt(amount);
      const difference = newAmount - oldAmount;

      // Check supply constraints if increasing
      if (difference > 0 && difference > asset.remainingSupply) {
        return res.status(400).json({ 
          error: `Insufficient supply. Only ${asset.remainingSupply} tokens available.` 
        });
      }

      // Update the token amount
      if (newAmount === 0) {
        await storage.deleteToken(req.params.tokenId);
      } else {
        await storage.updateTokenAmount(req.params.tokenId, newAmount);
      }

      // Update remaining supply
      await storage.updateAssetRemainingSupply(asset.id, asset.remainingSupply - difference);

      // Create transfer record for audit
      if (difference !== 0) {
        await storage.createTransfer({
          assetId: token.assetId,
          fromUserId: difference < 0 ? token.ownerId : null,
          toUserId: difference > 0 ? token.ownerId : null,
          tokenAmount: Math.abs(difference),
          reason: reason || (difference > 0 ? "MINT" : "ADMIN_REVOKE"),
        });
      }

      const updatedToken = newAmount > 0 ? await storage.getToken(req.params.tokenId) : null;
      res.json({ success: true, token: updatedToken, oldAmount, newAmount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
