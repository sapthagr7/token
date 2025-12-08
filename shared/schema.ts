import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "INVESTOR"]);
export const kycStatusEnum = pgEnum("kyc_status", ["PENDING", "APPROVED", "REJECTED"]);
export const assetTypeEnum = pgEnum("asset_type", ["real_estate", "commodity", "loan"]);
export const orderStatusEnum = pgEnum("order_status", ["OPEN", "FILLED", "CANCELLED"]);
export const transferReasonEnum = pgEnum("transfer_reason", ["TRANSFER", "MINT", "FREEZE", "UNFREEZE", "ADMIN_REVOKE", "TRADE"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("INVESTOR"),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("PENDING"),
  isFrozen: boolean("is_frozen").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: assetTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  totalSupply: integer("total_supply").notNull(),
  remainingSupply: integer("remaining_supply").notNull(),
  navPrice: decimal("nav_price", { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  frozen: boolean("frozen").notNull().default(false),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  buyerId: varchar("buyer_id").references(() => users.id),
  assetId: varchar("asset_id").notNull().references(() => assets.id),
  tokenAmount: integer("token_amount").notNull(),
  pricePerToken: decimal("price_per_token", { precision: 18, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  tokenAmount: integer("token_amount").notNull(),
  reason: transferReasonEnum("reason").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tokens: many(tokens),
  sellOrders: many(orders, { relationName: "seller" }),
  buyOrders: many(orders, { relationName: "buyer" }),
  transfersFrom: many(transfers, { relationName: "fromUser" }),
  transfersTo: many(transfers, { relationName: "toUser" }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  tokens: many(tokens),
  orders: many(orders),
  transfers: many(transfers),
}));

export const tokensRelations = relations(tokens, ({ one }) => ({
  asset: one(assets, { fields: [tokens.assetId], references: [assets.id] }),
  owner: one(users, { fields: [tokens.ownerId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  seller: one(users, { fields: [orders.sellerId], references: [users.id], relationName: "seller" }),
  buyer: one(users, { fields: [orders.buyerId], references: [users.id], relationName: "buyer" }),
  asset: one(assets, { fields: [orders.assetId], references: [assets.id] }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  asset: one(assets, { fields: [transfers.assetId], references: [assets.id] }),
  fromUser: one(users, { fields: [transfers.fromUserId], references: [users.id], relationName: "fromUser" }),
  toUser: one(users, { fields: [transfers.toUserId], references: [users.id], relationName: "toUser" }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Public registration schema - only allows name, email, password
// Prevents privilege escalation by not accepting role/kycStatus/isFrozen
export const publicRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  remainingSupply: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  buyerId: true,
  status: true,
});

export const mintTokensSchema = z.object({
  assetId: z.string(),
  userId: z.string(),
  amount: z.number().int().positive("Amount must be positive"),
});

export const transferTokensSchema = z.object({
  assetId: z.string(),
  toUserId: z.string(),
  amount: z.number().int().positive("Amount must be positive"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Token = typeof tokens.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Transfer = typeof transfers.$inferSelect;

export type UserWithTokens = User & { tokens: (Token & { asset: Asset })[] };
export type OrderWithDetails = Order & { seller: User; buyer?: User; asset: Asset };
export type TransferWithDetails = Transfer & { asset: Asset; fromUser?: User; toUser?: User };
