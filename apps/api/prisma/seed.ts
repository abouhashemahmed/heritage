// apps/api/prisma/seed.ts

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker/locale/en";
import cliProgress from "cli-progress";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

// ───── Setup ───────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = {
  products: Number(process.argv[process.argv.indexOf("--products") + 1] || 50),
  reviews: Number(process.argv[process.argv.indexOf("--reviews") + 1] || 200),
  export: process.argv.includes("--export"),
  verbose: process.argv.includes("--verbose"),
};

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

const CONFIG = {
  arabCountries: [
    "Palestine", "Morocco", "Egypt", "Jordan", "Lebanon",
    "Syria", "Algeria", "Iraq", "Tunisia", "Yemen"
  ],
  craftCategories: [
    "Ceramics", "Woodwork", "Textiles", "Accessories", "Jewelry",
    "Calligraphy", "Kitchenware", "Home Decor", "Spices", "Books"
  ],
  userRoles: ['ADMIN', ...Array(3).fill('SELLER'), ...Array(11).fill('BUYER')] as UserRole[],
  pricing: { minCents: 1500, maxCents: 25000 },
  saltRounds: 12,
  stockOptions: [
    { weight: 5, value: 0 },
    { weight: 30, value: 10 },
    { weight: 50, value: 50 },
    { weight: 15, value: 100 },
  ],
  batchSize: 100,
};

// ───── Helpers ─────────────────────────────────────────────
const generatePrice = () =>
  faker.number.float({ min: CONFIG.pricing.minCents / 100, max: CONFIG.pricing.maxCents / 100 });

const craftDescription = () =>
  `${faker.helpers.arrayElement(["hand-embroidered", "hand-carved", "traditional", "artisanal"])} ` +
  `${faker.helpers.arrayElement(["olive wood", "silver", "ceramic", "natural dyes"])} craft from ` +
  `${faker.helpers.arrayElement(CONFIG.arabCountries)}`;

const generateUsername = () =>
  `${faker.internet.userName().replace(/[^\w]/g, "").slice(0, 15)}-${faker.string.nanoid(4)}`;

const generatePassword = () =>
  faker.helpers.shuffle([
    faker.string.alphanumeric(6),
    faker.number.int(999),
    "!@#$%^&*"[faker.number.int(7)],
  ]).join("");

const weightedRandom = (options: { weight: number; value: number }[]) => {
  const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
  const r = Math.random() * totalWeight;
  let acc = 0;
  for (const option of options) {
    acc += option.weight;
    if (r <= acc) return option.value;
  }
  return options[options.length - 1].value;
};

const validateEmail = (email: string) => {
  const pattern = /^[\w.-]+@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  if (!pattern.test(email)) throw new Error(`Invalid email: ${email}`);
  return email;
};

const retry = async <T>(fn: () => Promise<T>, context: string, retries = 3): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    if (args.verbose) console.error(`[${context}] Retrying... (${retries} left)`);
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 1000));
      return retry(fn, context, retries - 1);
    }
    throw new Error(`${context} failed: ${err.message}`);
  }
};

// ───── Seed Script ─────────────────────────────────────────
async function main() {
  console.log("🔍 DATABASE_URL is:", process.env.DATABASE_URL);
  console.log("🌱 Starting seed...");

  const startTime = Date.now();
  const metadata = {
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    duration: 0,
  };

  await retry(() =>
    prisma.$transaction([
      prisma.review.deleteMany(),
      prisma.product.deleteMany(),
      prisma.user.deleteMany(),
    ]), "Database cleanup"
  );

  const heritage = await prisma.heritage.upsert({
    where: { slug: "palestinian" },
    update: {},
    create: { name: "Palestinian Heritage", slug: "palestinian" },
  });

  await Promise.all(CONFIG.craftCategories.map(tagName =>
    prisma.tag.upsert({
      where: { name: tagName },
      create: { name: tagName },
      update: {},
    })
  ));

  const users = [];
  const roles = faker.helpers.shuffle(CONFIG.userRoles);
  const userBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);
  userBar.start(roles.length, 0);

  for (const [i, role] of roles.entries()) {
    const email = validateEmail(`${role.toLowerCase()}.${generateUsername()}@ourarabheritage.com`);
    const password = await bcrypt.hash(generatePassword(), CONFIG.saltRounds);
    const user = await retry(() => prisma.user.create({
      data: {
        email,
        password,
        role,
        membership: role === "SELLER" || Math.random() > 0.5,
        proSeller: role === "SELLER" && Math.random() > 0.5,
        createdAt: faker.date.between({ from: "2020-01-01", to: new Date() }),
      },
    }), `User #${i}`);
    users.push(user);
    userBar.increment();
  }

  userBar.stop();

  const sellers = users.filter(u => u.role === "SELLER");
  if (!sellers.length) throw new Error("❌ No sellers created");

  const products = [];
  const productBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);
  productBar.start(args.products, 0);

  for (let i = 0; i < args.products; i++) {
    const product = await retry(() => prisma.product.create({
      data: {
        title: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
        description: craftDescription(),
        price: generatePrice(),
        country: faker.helpers.arrayElement(CONFIG.arabCountries),
        tags: {
          connectOrCreate: faker.helpers.arrayElements(CONFIG.craftCategories, 2).map(tag => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
        stock: weightedRandom(CONFIG.stockOptions), // ✅ Only include if in schema
        sellerId: faker.helpers.arrayElement(sellers).id,
        heritageId: heritage.id,
        createdAt: faker.date.between({ from: "2023-01-01", to: new Date() }),
      },
    }), `Product #${i}`);
    products.push(product);
    productBar.increment();
  }

  productBar.stop();

  const buyers = users.filter(u => u.role === "BUYER");
  if (!buyers.length) throw new Error("❌ No buyers created");

  let totalRating = 0;
  const reviewBatches: Promise<any>[] = [];

  for (let i = 0; i < Math.ceil(args.reviews / CONFIG.batchSize); i++) {
    const batchSize = Math.min(CONFIG.batchSize, args.reviews - i * CONFIG.batchSize);
    const batch = Array.from({ length: batchSize }).map(() => {
      const rating = faker.number.int({ min: 3, max: 5 });
      totalRating += rating;
      return {
        rating,
        comment: faker.datatype.boolean(0.7) ? faker.lorem.sentences({ min: 1, max: 3 }) : null,
        userId: faker.helpers.arrayElement(buyers).id,
        productId: faker.helpers.arrayElement(products).id,
        createdAt: faker.date.between({ from: "2023-01-01", to: new Date() }),
      };
    });
    reviewBatches.push(retry(() => prisma.review.createMany({ data: batch }), `Review batch #${i}`));
  }

  await Promise.all(reviewBatches);

  const averageRating = Number((totalRating / args.reviews).toFixed(2));
  const results = {
    totalProducts: products.length,
    totalReviews: args.reviews,
    averageRating,
  };

  metadata.duration = Number(((Date.now() - startTime) / 1000).toFixed(2));

  if (args.export) {
    const exportPath = path.join(__dirname, `seed-export-${Date.now()}.json`);
    await fs.writeFile(exportPath, JSON.stringify({
      metadata,
      results,
      users: users.map(u => ({ id: u.id, email: u.email, role: u.role })),
      products: products.map(p => ({ id: p.id, title: p.title, price: p.price })),
    }, null, 2));
    console.log(`📦 Exported data to: ${exportPath}`);
  }

  console.log(`✅ Done seeding ${users.length} users, ${products.length} products, ${args.reviews} reviews. Avg rating: ${averageRating}`);
  return [results, metadata];
}

main()
  .then(([results]) => prisma.$disconnect())
  .catch((err) => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  });
