import { db } from "./db";
import { users, assets } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@tokenvault.com"));

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      name: "Admin User",
      email: "admin@tokenvault.com",
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "ADMIN",
      kycStatus: "APPROVED",
      isFrozen: false,
    });
    console.log("Created admin user: admin@tokenvault.com / admin123");
  } else {
    console.log("Admin user already exists");
  }

  const existingAssets = await db.select().from(assets);
  if (existingAssets.length === 0) {
    await db.insert(assets).values([
      {
        type: "real_estate",
        title: "Manhattan Office Tower",
        description: "Premium Class A office space in Midtown Manhattan with 40 floors and modern amenities.",
        totalSupply: 10000,
        remainingSupply: 10000,
        navPrice: "150.00",
      },
      {
        type: "commodity",
        title: "Gold Bullion Reserve",
        description: "Physical gold bullion stored in secure Swiss vault with full insurance coverage.",
        totalSupply: 5000,
        remainingSupply: 5000,
        navPrice: "200.00",
      },
      {
        type: "loan",
        title: "Commercial Mortgage Pool",
        description: "Diversified portfolio of commercial real estate loans with average 6.5% yield.",
        totalSupply: 25000,
        remainingSupply: 25000,
        navPrice: "100.00",
      },
    ]);
    console.log("Created sample assets");
  } else {
    console.log("Assets already exist");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
