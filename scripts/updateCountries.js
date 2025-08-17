// scripts/updateCountries.js
const { PrismaClient } = require("@prisma/client");
const cliProgress = require("cli-progress");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

// 🔧 Configuration
const DEFAULT_ARAB_COUNTRIES = [
  "Algeria", "Bahrain", "Comoros", "Djibouti", "Egypt",
  "Iraq", "Jordan", "Kuwait", "Lebanon", "Libya",
  "Mauritania", "Morocco", "Oman", "Palestine",
  "Qatar", "Saudi Arabia", "Somalia", "Sudan",
  "Syria", "Tunisia", "United Arab Emirates", "Yemen"
];

const BATCH_SIZE = 500;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000;
const MAX_BATCH_SIZE = 5000;
const REPORT_FILE = path.join(__dirname, `country-update-report-${Date.now()}.json`);

// 📝 Logging
const logger = {
  info: (msg) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`)
};

// 🛠️ CLI Configuration
const argv = yargs(hideBin(process.argv))
  .option("dry-run", {
    alias: "d",
    type: "boolean",
    default: false,
    describe: "Simulate without database changes"
  })
  .option("countries-file", {
    alias: "f",
    type: "string",
    describe: "Path to JSON country list file"
  })
  .option("batch-size", {
    alias: "b",
    type: "number",
    default: BATCH_SIZE,
    describe: `Records per batch (1-${MAX_BATCH_SIZE})`
  })
  .option("enable-backup", {
    alias: "B",
    type: "boolean",
    default: false,
    describe: "Show database backup reminder"
  })
  .help()
  .argv;

// 🌍 Country Data Handling
function loadCountries() {
  if (argv.countriesFile) {
    try {
      const filePath = path.resolve(argv.countriesFile);
      const countries = require(filePath);
      
      if (!Array.isArray(countries)) {
        throw new Error("Invalid country list format");
      }

      // � Sanitization
      const sanitized = countries.map(c => 
        c.trim().replace(/[^a-zA-Z ]/g, '')
      ).filter(Boolean);

      if (sanitized.length === 0) {
        throw new Error("No valid countries found");
      }

      return [...new Set(sanitized)]; // Remove duplicates
    } catch (err) {
      logger.warn(`${err.message} - Using defaults`);
    }
  }
  return DEFAULT_ARAB_COUNTRIES;
}

const ACTIVE_COUNTRIES = loadCountries();

// 🔒 Validation
function validateData() {
  if (ACTIVE_COUNTRIES.length === 0) {
    throw new Error("No valid countries available");
  }

  if (ACTIVE_COUNTRIES.some(c => typeof c !== "string")) {
    throw new Error("Country list contains non-string values");
  }

  if (argv.batchSize < 1 || argv.batchSize > MAX_BATCH_SIZE) {
    throw new Error(`Batch size must be 1-${MAX_BATCH_SIZE}`);
  }
}

// 🎯 Country Assignment Logic
function determineCountry(product) {
  const title = (product.title || "").toLowerCase();
  
  // 🔍 Precise matching with word boundaries
  const matchedCountry = ACTIVE_COUNTRIES.find(c => {
    const countryPattern = new RegExp(`\\b${c.toLowerCase()}\\b`);
    return countryPattern.test(title);
  });

  // 🔢 Deterministic fallback
  return matchedCountry || 
    ACTIVE_COUNTRIES[product.id % ACTIVE_COUNTRIES.length];
}

// 🔄 Batch Processing with Retries
async function processBatch(batch, attempt = 1) {
  try {
    return await prisma.$transaction(async (tx) => {
      const results = [];
      for (const update of batch) {
        results.push(await tx.product.update(update));
      }
      return results;
    });
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY * attempt;
      logger.warn(`Retry ${attempt}/${MAX_RETRIES} (${delay}ms delay)`);
      await new Promise(res => setTimeout(res, delay));
      return processBatch(batch, attempt + 1);
    }
    throw err;
  }
}

// 📊 Reporting System
async function generateReport(results) {
  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      config: {
        dryRun: argv.dryRun,
        batchSize: argv.batchSize,
        countrySource: argv.countriesFile || "default"
      }
    },
    stats: {
      ...results,
      countryDistribution: results.countryTally
    }
  };

  try {
    await fs.promises.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
    logger.info(`Report saved to: ${REPORT_FILE}`);
  } catch (err) {
    logger.warn(`Failed to save report: ${err.message}`);
  }
}

// 🔍 Database Verification
async function verifyDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.product.count();
    logger.info(`Database connection verified (${count} products)`);
  } catch (err) {
    throw new Error(`Database connection failed: ${err.message}`);
  }
}

// 🚀 Main Update Workflow
async function updateProducts() {
  try {
    logger.info("Starting country update workflow");
    
    // 🛡️ Pre-flight checks
    validateData();
    await verifyDatabase();
    
    if (argv.enableBackup) {
      logger.warn("‼️  Ensure you have a recent database backup!");
    }

    // 📥 Fetch target products
    const products = await prisma.product.findMany({
      where: { 
        OR: [
          { country: null }, 
          { country: "" },
          { country: { notIn: ACTIVE_COUNTRIES } }
        ]
      },
      select: { id: true, title: true }
    });

    if (products.length === 0) {
      logger.info("✅ All products have valid country data");
      return { updated: 0, countryTally: {} };
    }

    // 🧩 Prepare updates
    const updateData = products.map(product => ({
      where: { id: product.id },
      data: { country: determineCountry(product) }
    }));

    // 🧪 Dry-run simulation
    if (argv.dryRun) {
      logger.info("🚧 Dry run mode activated");
      console.table(updateData.slice(0, 5).map((d, i) => ({
        ID: d.where.id,
        Title: (products[i]?.title || "").slice(0, 40) + "...",
        Assigned: d.data.country
      })));
      logger.info(`📋 Would update ${updateData.length} products`);
      return { updated: 0, countryTally: {} };
    }

    // 🔄 Batch processing
    const progressBar = new cliProgress.SingleBar({
      format: "🔄 [{bar}] {percentage}% | {value}/{total} | ETA: {eta}s | Speed: {speed}",
      barCompleteChar: "▓",
      barIncompleteChar: "░",
      barsize: 40,
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(updateData.length, 0);
    
    let processed = 0;
    const countryTally = {};

    while (processed < updateData.length) {
      const batch = updateData.slice(processed, processed + argv.batchSize);
      const results = await processBatch(batch);
      
      results.forEach(({ country }) => {
        countryTally[country] = (countryTally[country] || 0) + 1;
      });

      processed += batch.length;
      progressBar.update(processed);
    }

    progressBar.stop();
    logger.info(`✅ Successfully updated ${processed} products`);

    // 📈 Display summary
    console.log("\n📊 Country Distribution Summary:");
    console.table(Object.entries(countryTally).sort((a, b) => b[1] - a[1]));

    return { updated: processed, countryTally };
  } catch (err) {
    logger.error(`🚨 Critical error: ${err.message}`);
    throw err;
  }
}

// 🏁 Main Execution
(async () => {
  const startTime = Date.now();
  let result = {};

  try {
    result = await updateProducts();
    await generateReport(result);
  } catch (err) {
    result.error = err.message;
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    logger.info("Database connection terminated");
    logger.info(`⏱️  Total duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    process.exit(result.error ? 1 : 0);
  }
})();