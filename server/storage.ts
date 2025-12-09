import { 
  users, assets, tokens, orders, transfers, priceHistory, kycDocuments, navHistory,
  type User, type InsertUser, type Asset, type InsertAsset,
  type Token, type Order, type InsertOrder, type Transfer, type PriceHistory, type KycDocument, type NavHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { name: string; email: string; passwordHash: string; role?: "ADMIN" | "INVESTOR"; kycStatus?: "PENDING" | "APPROVED" | "REJECTED"; isFrozen?: boolean }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserKycStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<User | undefined>;
  updateUserFrozenStatus(id: string, isFrozen: boolean): Promise<User | undefined>;
  
  getAsset(id: string): Promise<Asset | undefined>;
  getAllAssets(): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAssetRemainingSupply(id: string, remainingSupply: number): Promise<Asset | undefined>;
  
  getToken(id: string): Promise<Token | undefined>;
  getTokensByUser(userId: string): Promise<(Token & { asset: Asset })[]>;
  getTokenByAssetAndUser(assetId: string, userId: string): Promise<Token | undefined>;
  getAllTokensWithDetails(): Promise<(Token & { asset: Asset; owner: User })[]>;
  createToken(assetId: string, ownerId: string, amount: number): Promise<Token>;
  updateTokenAmount(id: string, amount: number): Promise<Token | undefined>;
  deleteToken(id: string): Promise<void>;
  
  getOrder(id: string): Promise<Order | undefined>;
  getOpenOrders(): Promise<(Order & { seller: User; asset: Asset })[]>;
  getOrdersByUser(userId: string): Promise<(Order & { asset: Asset })[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: "OPEN" | "FILLED" | "CANCELLED", buyerId?: string): Promise<Order | undefined>;
  
  getTransfers(limit?: number): Promise<(Transfer & { asset: Asset; fromUser?: User; toUser?: User })[]>;
  createTransfer(transfer: Omit<Transfer, "id" | "timestamp">): Promise<Transfer>;
  
  getStats(): Promise<{ totalUsers: number; pendingKyc: number; totalAssets: number; totalTokensMinted: number }>;
  
  // Price history
  getPriceHistory(assetId: string, limit?: number): Promise<PriceHistory[]>;
  createPriceHistory(assetId: string, price: string, volume: number, orderId?: string): Promise<PriceHistory>;
  getAssetMarketData(): Promise<{ assetId: string; asset: Asset; bestBid: string | null; bestAsk: string | null; lastPrice: string | null; volume24h: number }[]>;
  
  // KYC Documents
  getKycDocuments(userId: string): Promise<KycDocument[]>;
  getAllPendingDocuments(): Promise<(KycDocument & { user: User })[]>;
  createKycDocument(userId: string, documentType: string, fileName: string, fileData: string): Promise<KycDocument>;
  updateKycDocumentStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED", reviewNotes?: string): Promise<KycDocument | undefined>;
  
  // NAV History
  getNavHistory(assetId: string, limit?: number): Promise<NavHistory[]>;
  createNavHistory(assetId: string, navPrice: string, reason?: string): Promise<NavHistory>;
  getAssetAnalytics(assetId: string): Promise<{
    asset: Asset;
    currentNav: string;
    navHistory: NavHistory[];
    priceHistory: PriceHistory[];
    totalTradeVolume: number;
    totalTrades: number;
    holdersCount: number;
    supplyDistribution: { ownerId: string; amount: number }[];
  } | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: { name: string; email: string; passwordHash: string; role?: "ADMIN" | "INVESTOR"; kycStatus?: "PENDING" | "APPROVED" | "REJECTED"; isFrozen?: boolean }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        passwordHash: userData.passwordHash,
        role: userData.role || "INVESTOR",
        kycStatus: userData.kycStatus || "PENDING",
        isFrozen: userData.isFrozen || false,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserKycStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ kycStatus: status })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserFrozenStatus(id: string, isFrozen: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isFrozen })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async getAllAssets(): Promise<Asset[]> {
    return await db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values({
        type: assetData.type,
        title: assetData.title,
        description: assetData.description,
        totalSupply: assetData.totalSupply,
        remainingSupply: assetData.totalSupply,
        navPrice: assetData.navPrice,
      })
      .returning();
    return asset;
  }

  async updateAssetRemainingSupply(id: string, remainingSupply: number): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set({ remainingSupply })
      .where(eq(assets.id, id))
      .returning();
    return asset || undefined;
  }

  async getToken(id: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token || undefined;
  }

  async getTokensByUser(userId: string): Promise<(Token & { asset: Asset })[]> {
    const result = await db
      .select()
      .from(tokens)
      .innerJoin(assets, eq(tokens.assetId, assets.id))
      .where(eq(tokens.ownerId, userId));
    
    return result.map((row) => ({
      ...row.tokens,
      asset: row.assets,
    }));
  }

  async getTokenByAssetAndUser(assetId: string, userId: string): Promise<Token | undefined> {
    const [token] = await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.assetId, assetId), eq(tokens.ownerId, userId)));
    return token || undefined;
  }

  async getAllTokensWithDetails(): Promise<(Token & { asset: Asset; owner: User })[]> {
    const result = await db
      .select()
      .from(tokens)
      .innerJoin(assets, eq(tokens.assetId, assets.id))
      .innerJoin(users, eq(tokens.ownerId, users.id));
    
    return result.map((row) => ({
      ...row.tokens,
      asset: row.assets,
      owner: row.users,
    }));
  }

  async createToken(assetId: string, ownerId: string, amount: number): Promise<Token> {
    const [token] = await db
      .insert(tokens)
      .values({ assetId, ownerId, amount, frozen: false })
      .returning();
    return token;
  }

  async updateTokenAmount(id: string, amount: number): Promise<Token | undefined> {
    const [token] = await db
      .update(tokens)
      .set({ amount })
      .where(eq(tokens.id, id))
      .returning();
    return token || undefined;
  }

  async deleteToken(id: string): Promise<void> {
    await db.delete(tokens).where(eq(tokens.id, id));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOpenOrders(): Promise<(Order & { seller: User; asset: Asset })[]> {
    const result = await db
      .select()
      .from(orders)
      .innerJoin(users, eq(orders.sellerId, users.id))
      .innerJoin(assets, eq(orders.assetId, assets.id))
      .where(eq(orders.status, "OPEN"))
      .orderBy(desc(orders.createdAt));
    
    return result.map((row) => ({
      ...row.orders,
      seller: row.users,
      asset: row.assets,
    }));
  }

  async getOrdersByUser(userId: string): Promise<(Order & { asset: Asset })[]> {
    const result = await db
      .select()
      .from(orders)
      .innerJoin(assets, eq(orders.assetId, assets.id))
      .where(eq(orders.sellerId, userId))
      .orderBy(desc(orders.createdAt));
    
    return result.map((row) => ({
      ...row.orders,
      asset: row.assets,
    }));
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        sellerId: orderData.sellerId,
        assetId: orderData.assetId,
        tokenAmount: orderData.tokenAmount,
        pricePerToken: orderData.pricePerToken,
        status: "OPEN",
      })
      .returning();
    return order;
  }

  async updateOrderStatus(id: string, status: "OPEN" | "FILLED" | "CANCELLED", buyerId?: string): Promise<Order | undefined> {
    const updateData: { status: typeof status; buyerId?: string } = { status };
    if (buyerId) updateData.buyerId = buyerId;

    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async getTransfers(limit?: number): Promise<(Transfer & { asset: Asset; fromUser?: User; toUser?: User })[]> {
    const query = db
      .select()
      .from(transfers)
      .innerJoin(assets, eq(transfers.assetId, assets.id))
      .leftJoin(users, eq(transfers.fromUserId, users.id))
      .orderBy(desc(transfers.timestamp));

    const result = limit ? await query.limit(limit) : await query;
    
    const transfersWithToUser = await Promise.all(
      result.map(async (row) => {
        let toUser: User | undefined;
        if (row.transfers.toUserId) {
          const [user] = await db.select().from(users).where(eq(users.id, row.transfers.toUserId));
          toUser = user;
        }
        return {
          ...row.transfers,
          asset: row.assets,
          fromUser: row.users || undefined,
          toUser,
        };
      })
    );

    return transfersWithToUser;
  }

  async createTransfer(transferData: Omit<Transfer, "id" | "timestamp">): Promise<Transfer> {
    const [transfer] = await db
      .insert(transfers)
      .values(transferData)
      .returning();
    return transfer;
  }

  async getStats(): Promise<{ totalUsers: number; pendingKyc: number; totalAssets: number; totalTokensMinted: number }> {
    const [userStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${users.kycStatus} = 'PENDING')::int`,
      })
      .from(users);

    const [assetStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(assets);

    const [tokenStats] = await db
      .select({ total: sql<number>`coalesce(sum(${tokens.amount}), 0)::int` })
      .from(tokens);

    return {
      totalUsers: userStats?.total || 0,
      pendingKyc: userStats?.pending || 0,
      totalAssets: assetStats?.total || 0,
      totalTokensMinted: tokenStats?.total || 0,
    };
  }

  // Price history methods
  async getPriceHistory(assetId: string, limit?: number): Promise<PriceHistory[]> {
    const query = db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.assetId, assetId))
      .orderBy(asc(priceHistory.timestamp));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createPriceHistory(assetId: string, price: string, volume: number, orderId?: string): Promise<PriceHistory> {
    const [record] = await db
      .insert(priceHistory)
      .values({ assetId, price, volume, orderId })
      .returning();
    return record;
  }

  async getAssetMarketData(): Promise<{ assetId: string; asset: Asset; bestBid: string | null; bestAsk: string | null; lastPrice: string | null; volume24h: number }[]> {
    const allAssets = await this.getAllAssets();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const marketData = await Promise.all(
      allAssets.map(async (asset) => {
        // Get open orders for bid/ask
        const openOrders = await db
          .select()
          .from(orders)
          .where(and(eq(orders.assetId, asset.id), eq(orders.status, "OPEN")));

        // For now, we only have sell orders (asks)
        const asks = openOrders.map(o => parseFloat(o.pricePerToken));
        const bestAsk = asks.length > 0 ? Math.min(...asks).toFixed(2) : null;

        // Get last trade price
        const [lastTrade] = await db
          .select()
          .from(priceHistory)
          .where(eq(priceHistory.assetId, asset.id))
          .orderBy(desc(priceHistory.timestamp))
          .limit(1);

        // Get 24h volume
        const [volumeResult] = await db
          .select({ total: sql<number>`coalesce(sum(${priceHistory.volume}), 0)::int` })
          .from(priceHistory)
          .where(and(
            eq(priceHistory.assetId, asset.id),
            sql`${priceHistory.timestamp} > ${oneDayAgo}`
          ));

        return {
          assetId: asset.id,
          asset,
          bestBid: null, // Would need buy orders to implement
          bestAsk,
          lastPrice: lastTrade?.price || null,
          volume24h: volumeResult?.total || 0,
        };
      })
    );

    return marketData;
  }

  // KYC Documents methods
  async getKycDocuments(userId: string): Promise<KycDocument[]> {
    return await db
      .select()
      .from(kycDocuments)
      .where(eq(kycDocuments.userId, userId))
      .orderBy(desc(kycDocuments.uploadedAt));
  }

  async getAllPendingDocuments(): Promise<(KycDocument & { user: User })[]> {
    const result = await db
      .select()
      .from(kycDocuments)
      .innerJoin(users, eq(kycDocuments.userId, users.id))
      .where(eq(kycDocuments.status, "PENDING"))
      .orderBy(desc(kycDocuments.uploadedAt));

    return result.map(row => ({
      ...row.kyc_documents,
      user: row.users,
    }));
  }

  async createKycDocument(userId: string, documentType: string, fileName: string, fileData: string): Promise<KycDocument> {
    const [doc] = await db
      .insert(kycDocuments)
      .values({ userId, documentType, fileName, fileData })
      .returning();
    return doc;
  }

  async updateKycDocumentStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED", reviewNotes?: string): Promise<KycDocument | undefined> {
    const [doc] = await db
      .update(kycDocuments)
      .set({ status, reviewNotes, reviewedAt: new Date() })
      .where(eq(kycDocuments.id, id))
      .returning();
    return doc || undefined;
  }

  // NAV History methods
  async getNavHistory(assetId: string, limit?: number): Promise<NavHistory[]> {
    const query = db
      .select()
      .from(navHistory)
      .where(eq(navHistory.assetId, assetId))
      .orderBy(desc(navHistory.timestamp));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createNavHistory(assetId: string, navPrice: string, reason?: string): Promise<NavHistory> {
    const [entry] = await db
      .insert(navHistory)
      .values({ assetId, navPrice, reason })
      .returning();
    return entry;
  }

  async getAssetAnalytics(assetId: string): Promise<{
    asset: Asset;
    currentNav: string;
    navHistory: NavHistory[];
    priceHistory: PriceHistory[];
    totalTradeVolume: number;
    totalTrades: number;
    holdersCount: number;
    supplyDistribution: { ownerId: string; amount: number }[];
  } | null> {
    const asset = await this.getAsset(assetId);
    if (!asset) return null;

    const navHistoryData = await this.getNavHistory(assetId, 100);
    const priceHistoryData = await this.getPriceHistory(assetId, 100);

    // Total trade volume and count
    const [volumeResult] = await db
      .select({
        totalVolume: sql<number>`coalesce(sum(${priceHistory.volume}), 0)::int`,
        totalTrades: sql<number>`count(*)::int`,
      })
      .from(priceHistory)
      .where(eq(priceHistory.assetId, assetId));

    // Get holders count and distribution
    const tokenHolders = await db
      .select()
      .from(tokens)
      .where(eq(tokens.assetId, assetId));

    const supplyDistribution = tokenHolders
      .filter(t => t.amount > 0)
      .map(t => ({ ownerId: t.ownerId, amount: t.amount }));

    return {
      asset,
      currentNav: asset.navPrice,
      navHistory: navHistoryData,
      priceHistory: priceHistoryData,
      totalTradeVolume: volumeResult?.totalVolume || 0,
      totalTrades: volumeResult?.totalTrades || 0,
      holdersCount: supplyDistribution.length,
      supplyDistribution,
    };
  }
}

export const storage = new DatabaseStorage();
