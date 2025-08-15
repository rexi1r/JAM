// server.js (revised)
// ------------------------------------------------------------
// تغییرات کلیدی:
// - الزام JWT_SECRET و JWT_REFRESH_SECRET
// - افزودن Helmet, CORS کنترل‌شده، compression، morgan لاگ
// - Rate limit عمومی و ویژه‌ی ورود
// - اعتبارسنجی ورودی‌ها با celebrate/Joi
// - بهبود اتصال mongoose + strictQuery
// - timestamps و ایندکس‌ها برای Contract
// - بهبود pagination و جستجوی امن با escapeRegExp
// - پشتیبانی از Authorization: Bearer ... و x-auth-token
// - توکن دسترسی 1h + رفرش 7d و مسیر /api/auth/refresh
// - /healthz برای سلامت سرویس و خطایاب مرکزی
// ------------------------------------------------------------

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const {
  celebrate,
  Joi,
  errors: celebrateErrors,
  Segments,
} = require("celebrate");

// --- App bootstrap
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY);

// Parse JSON (limit معقول)
app.use(express.json({ limit: "1mb" }));

// امنیت هدرها
app.use(helmet());

// فشرده‌سازی پاسخ‌ها
app.use(compression());

// لاگ HTTP
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// CORS کنترل‌شده
// ALLOWED_ORIGINS= http://localhost:3000,https://example.com
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED.length === 0 || ALLOWED.includes(origin))
        return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const activityLogger = (req, res, next) => {
  res.on("finish", () => {
    if (
      req.method !== "GET" &&
      res.statusCode < 400 &&
      req.user &&
      req.originalUrl.startsWith("/api")
    ) {
      ActivityLog.create({
        user: req.user.username,
        method: req.method,
        endpoint: req.originalUrl,
      }).catch((err) =>
        console.error("ActivityLog error:", err.message)
      );
    }
  });
  next();
};

app.use(activityLogger);

// Rate limit عمومی
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Rate limit سخت‌گیرانه‌تر برای ورود
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Env guards
const {
  MONGO_URI: mongoUriEnv,
  MONGO_INITDB_ROOT_USERNAME,
  MONGO_INITDB_ROOT_PASSWORD,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
} = process.env;

const MONGO_URI =
  mongoUriEnv ||
  `mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongo:27017/contracts?authSource=admin`;
if (!JWT_SECRET) throw new Error("JWT_SECRET must be defined");
if (!JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET must be defined");

// --- Mongo connection (با backoff ساده)
mongoose.set("strictQuery", true);
let mongoConnected = false;
const connectWithRetry = () => {
  mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
      mongoConnected = true;
      console.log("Connected to MongoDB");
      await createDefaultAdmin();
      await SampleData.seed();
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
      setTimeout(connectWithRetry, 5000);
    });
};
if (process.env.NODE_ENV === "test") {
  mongoConnected = true;
} else {
  connectWithRetry();
}

// --- Schemas & Models
const PAGE_NAMES = [
  "mySettings",
  "customerSettings",
  "hallReporting",
  "studioReporting",
  "userManagement",
  // Pages related to contract listings were previously missing which
  // caused selected permissions to be discarded on save. Including them
  // ensures allowedPages for admin users cover every page exposed on the
  // frontend.
  "hallContracts",
  "studioContracts",
  "createContract",
  "studioContract",
  "activityLogs",
  "calendar",
];

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    allowedPages: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);

const createDefaultAdmin = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const admin = new User({
        username: "admin",
        password: "1369Admin",
        role: "admin",
        allowedPages: PAGE_NAMES,
      });
      await admin.save();
      console.log("Default admin user created: admin/admin");
    }
  } catch (err) {
    console.error("Error creating default admin user:", err.message);
  }
};

const settingsSchema = new mongoose.Schema(
  {
    defaultHourlyRate: { type: Number, default: 0 },
    defaultExtraHourPrice: { type: Number, default: 0 },
    defaultServiceFeePerPerson: { type: Number, default: 0 },
    defaultTaxRate: { type: Number, default: 0 },
    defaultJuicePricePerPerson: { type: Number, default: 0 },
    defaultTeaPricePerPerson: { type: Number, default: 0 },
    defaultFireworkPricePerUnit: { type: Number, default: 0 },
    defaultCandlePrice: { type: Number, default: 0 },
    defaultFlowerPrice: { type: Number, default: 0 },
    defaultWaterPricePerUnit: { type: Number, default: 0 },
    defaultDinnerPricePerPerson: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const MySettings = mongoose.model("MySettings", settingsSchema);
const CustomerSettings = mongoose.model("CustomerSettings", settingsSchema);

const activityLogSchema = new mongoose.Schema(
  {
    user: String,
    method: String,
    endpoint: String,
  },
  { timestamps: true }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

const contractSchema = new mongoose.Schema(
  {
    contractOwner: { type: String, required: true, index: true },
    groomFirstName: { type: String, required: true },
    groomLastName: { type: String, required: true },
    groomNationalId: { type: String, required: true },
    spouseFirstName: { type: String, required: true },
    spouseLastName: { type: String, required: true },
    spouseNationalId: { type: String, required: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    inviteesCount: { type: Number, default: 0 },
    eventDate: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    serviceStaffCount: { type: Number, default: 0 },
    juiceCount: { type: Number, default: 0 },
    teaCount: { type: Number, default: 0 },
    fireworkCount: { type: Number, default: 0 },
    waterCount: { type: Number, default: 0 },
    dinnerCount: { type: Number, default: 0 },
    dinnerType: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    extraDetails: { type: String, default: "" },
    extraItems: {
      type: [
        {
          title: { type: String, default: "" },
          price: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    customerTotalCost: { type: Number, default: 0 },
    myTotalCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["final", "reservation", "cancelled"],
      default: "reservation",
    },
    includeCandle: { type: Boolean, default: false },
    includeFlower: { type: Boolean, default: false },
    includeJuice: { type: Boolean, default: false },
    includeTea: { type: Boolean, default: false },
    includeFirework: { type: Boolean, default: false },
    includeWater: { type: Boolean, default: false },
    includeDinner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Contract = mongoose.model("Contract", contractSchema);

const studioContractSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, index: true },
    ceremonyType: { type: String, default: "" },
    invoiceDate: { type: String, default: "" },
    lunch: { type: String, default: "" },
    dinner: { type: String, default: "" },
    homeAddress: { type: String, default: "" },
    groomName: { type: String, default: "" },
    groomPhone: { type: String, default: "" },
    brideName: { type: String, default: "" },
    bridePhone: { type: String, default: "" },
    ceremonyLocation: { type: String, default: "" },
    clipProduction: { type: Boolean, default: false },
    insideProvince: { type: Boolean, default: false },
    outsideProvince: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    hennaDate: { type: String, default: "" },
    engagementDate: { type: String, default: "" },
    weddingDate: { type: String, default: "" },
    services: {
      type: [
        {
          name: String,
          quantity: String,
          price: String,
          details: String,
        },
      ],
      default: [],
    },
    totalPrice: { type: String, default: "" },
    prePayment: { type: String, default: "" },
  },
  { timestamps: true }
);

const StudioContract = mongoose.model("StudioContract", studioContractSchema);

const contractBodySchema = Joi.object({
  contractOwner: Joi.string().required(),
  groomFirstName: Joi.string().required(),
  groomLastName: Joi.string().required(),
  groomNationalId: Joi.string().required(),
  spouseFirstName: Joi.string().required(),
  spouseLastName: Joi.string().required(),
  spouseNationalId: Joi.string().required(),
  address: Joi.string().allow("").default(""),
  phone: Joi.string().allow("").default(""),
  email: Joi.string().email().allow("").default(""),
  inviteesCount: Joi.number().min(0).default(0),
  eventDate: Joi.string().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  serviceStaffCount: Joi.number().min(0).default(0),
  juiceCount: Joi.number().min(0).default(0),
  teaCount: Joi.number().min(0).default(0),
  fireworkCount: Joi.number().min(0).default(0),
  waterCount: Joi.number().min(0).default(0),
  dinnerCount: Joi.number().min(0).default(0),
  dinnerType: Joi.string().allow("").default(""),
  discount: Joi.number().min(0).default(0),
  extraDetails: Joi.string().allow("").default(""),
  extraItems: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required(),
        price: Joi.number().min(0).required(),
      })
    )
    .default([]),
  customerTotalCost: Joi.number().min(0).default(0),
  myTotalCost: Joi.number().min(0).default(0),
  status: Joi.string()
    .valid("final", "reservation", "cancelled")
    .default("reservation"),
  includeCandle: Joi.boolean().default(false),
  includeFlower: Joi.boolean().default(false),
  includeJuice: Joi.boolean().default(false),
  includeTea: Joi.boolean().default(false),
  includeFirework: Joi.boolean().default(false),
  includeWater: Joi.boolean().default(false),
  includeDinner: Joi.boolean().default(false),
}).unknown(false);

const studioContractBodySchema = Joi.object({
  fullName: Joi.string().required(),
  ceremonyType: Joi.string().allow("").default(""),
  invoiceDate: Joi.string().allow("").default(""),
  lunch: Joi.string().allow("").default(""),
  dinner: Joi.string().allow("").default(""),
  homeAddress: Joi.string().allow("").default(""),
  groomName: Joi.string().allow("").default(""),
  groomPhone: Joi.string().allow("").default(""),
  brideName: Joi.string().allow("").default(""),
  bridePhone: Joi.string().allow("").default(""),
  ceremonyLocation: Joi.string().allow("").default(""),
  clipProduction: Joi.boolean().default(false),
  insideProvince: Joi.boolean().default(false),
  outsideProvince: Joi.boolean().default(false),
  notes: Joi.string().allow("").default(""),
  hennaDate: Joi.string().allow("").default(""),
  engagementDate: Joi.string().allow("").default(""),
  weddingDate: Joi.string().allow("").default(""),
  services: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        quantity: Joi.string().allow("").default(""),
        price: Joi.string().allow("").default(""),
        details: Joi.string().allow("").default(""),
      })
    )
    .default([]),
  totalPrice: Joi.string().allow("").default(""),
  prePayment: Joi.string().allow("").default(""),
}).unknown(false);

// --- Sample data seeding
class SampleData {
  static async seedSettings() {
    const myCount = await MySettings.countDocuments();
    if (myCount === 0) {
      await MySettings.create({
        defaultHourlyRate: 500000,
        defaultExtraHourPrice: 300000,
        defaultServiceFeePerPerson: 50000,
        defaultTaxRate: 9,
        defaultJuicePricePerPerson: 20000,
        defaultTeaPricePerPerson: 10000,
        defaultFireworkPricePerUnit: 50000,
        defaultCandlePrice: 15000,
        defaultFlowerPrice: 30000,
        defaultWaterPricePerUnit: 5000,
        defaultDinnerPricePerPerson: 100000,
      });
    }

    const customerCount = await CustomerSettings.countDocuments();
    if (customerCount === 0) {
      await CustomerSettings.create({
        defaultHourlyRate: 700000,
        defaultExtraHourPrice: 400000,
        defaultServiceFeePerPerson: 60000,
        defaultTaxRate: 9,
        defaultJuicePricePerPerson: 25000,
        defaultTeaPricePerPerson: 12000,
        defaultFireworkPricePerUnit: 70000,
        defaultCandlePrice: 20000,
        defaultFlowerPrice: 40000,
        defaultWaterPricePerUnit: 7000,
        defaultDinnerPricePerPerson: 150000,
      });
    }
  }

  static async seedContract() {
    const count = await Contract.countDocuments();
    if (count === 0) {
      await Contract.create([
        {
          contractOwner: "نمونه ۱",
          groomFirstName: "علی",
          groomLastName: "رضایی",
          groomNationalId: "1234567890",
          spouseFirstName: "سمیرا",
          spouseLastName: "کریمی",
          spouseNationalId: "0987654321",
          address: "تهران",
          phone: "0912000000",
          email: "sample@example.com",
          inviteesCount: 120,
          eventDate: "1403/01/05",
          startTime: "18:00",
          endTime: "23:00",
          serviceStaffCount: 5,
          juiceCount: 120,
          teaCount: 120,
          fireworkCount: 10,
          waterCount: 120,
          dinnerCount: 120,
          discount: 0,
          extraDetails: "نمونه قرارداد برای شروع",
          extraItems: [{ title: "نورپردازی اضافه", price: 500000 }],
          customerTotalCost: 10000000,
          myTotalCost: 7000000,
          status: "final",
          includeCandle: true,
          includeFlower: true,
          includeJuice: true,
          includeTea: true,
          includeFirework: true,
          includeWater: true,
          includeDinner: true,
        },
        {
          contractOwner: "نمونه ۲",
          groomFirstName: "علی",
          groomLastName: "رضایی",
          groomNationalId: "1234567890",
          spouseFirstName: "سمیرا",
          spouseLastName: "کریمی",
          spouseNationalId: "0987654321",
          address: "تهران",
          phone: "0912000000",
          email: "sample@example.com",
          inviteesCount: 120,
          eventDate: "1403/02/10",
          startTime: "18:00",
          endTime: "23:00",
          serviceStaffCount: 5,
          juiceCount: 120,
          teaCount: 120,
          fireworkCount: 10,
          waterCount: 120,
          dinnerCount: 120,
          discount: 0,
          extraDetails: "نمونه قرارداد برای شروع",
          extraItems: [{ title: "نورپردازی اضافه", price: 500000 }],
          customerTotalCost: 10000000,
          myTotalCost: 7000000,
          status: "final",
          includeCandle: true,
          includeFlower: true,
          includeJuice: true,
          includeTea: true,
          includeFirework: true,
          includeWater: true,
          includeDinner: true,
        },
        {
          contractOwner: "نمونه ۳",
          groomFirstName: "علی",
          groomLastName: "رضایی",
          groomNationalId: "1234567890",
          spouseFirstName: "سمیرا",
          spouseLastName: "کریمی",
          spouseNationalId: "0987654321",
          address: "تهران",
          phone: "0912000000",
          email: "sample@example.com",
          inviteesCount: 120,
          eventDate: "1403/02/20",
          startTime: "18:00",
          endTime: "23:00",
          serviceStaffCount: 5,
          juiceCount: 120,
          teaCount: 120,
          fireworkCount: 10,
          waterCount: 120,
          dinnerCount: 120,
          discount: 0,
          extraDetails: "نمونه قرارداد برای شروع",
          extraItems: [{ title: "نورپردازی اضافه", price: 500000 }],
          customerTotalCost: 10000000,
          myTotalCost: 7000000,
          status: "final",
          includeCandle: true,
          includeFlower: true,
          includeJuice: true,
          includeTea: true,
          includeFirework: true,
          includeWater: true,
          includeDinner: true,
        },
        {
          contractOwner: "نمونه ۴",
          groomFirstName: "علی",
          groomLastName: "رضایی",
          groomNationalId: "1234567890",
          spouseFirstName: "سمیرا",
          spouseLastName: "کریمی",
          spouseNationalId: "0987654321",
          address: "تهران",
          phone: "0912000000",
          email: "sample@example.com",
          inviteesCount: 120,
          eventDate: "1403/04/15",
          startTime: "18:00",
          endTime: "23:00",
          serviceStaffCount: 5,
          juiceCount: 120,
          teaCount: 120,
          fireworkCount: 10,
          waterCount: 120,
          dinnerCount: 120,
          discount: 0,
          extraDetails: "نمونه قرارداد برای شروع",
          extraItems: [{ title: "نورپردازی اضافه", price: 500000 }],
          customerTotalCost: 10000000,
          myTotalCost: 7000000,
          status: "final",
          includeCandle: true,
          includeFlower: true,
          includeJuice: true,
          includeTea: true,
          includeFirework: true,
          includeWater: true,
          includeDinner: true,
        },
        {
          contractOwner: "نمونه ۵",
          groomFirstName: "علی",
          groomLastName: "رضایی",
          groomNationalId: "1234567890",
          spouseFirstName: "سمیرا",
          spouseLastName: "کریمی",
          spouseNationalId: "0987654321",
          address: "تهران",
          phone: "0912000000",
          email: "sample@example.com",
          inviteesCount: 120,
          eventDate: "1403/06/01",
          startTime: "18:00",
          endTime: "23:00",
          serviceStaffCount: 5,
          juiceCount: 120,
          teaCount: 120,
          fireworkCount: 10,
          waterCount: 120,
          dinnerCount: 120,
          discount: 0,
          extraDetails: "نمونه قرارداد برای شروع",
          extraItems: [{ title: "نورپردازی اضافه", price: 500000 }],
          customerTotalCost: 10000000,
          myTotalCost: 7000000,
          status: "final",
          includeCandle: true,
          includeFlower: true,
          includeJuice: true,
          includeTea: true,
          includeFirework: true,
          includeWater: true,
          includeDinner: true,
        },
        {
          contractOwner: "نمونه ۶",
          groomFirstName: "علی",
          groomLastName: "رضایی",
          groomNationalId: "1234567890",
          spouseFirstName: "سمیرا",
          spouseLastName: "کریمی",
          spouseNationalId: "0987654321",
          address: "تهران",
          phone: "0912000000",
          email: "sample@example.com",
          inviteesCount: 120,
          eventDate: "1403/06/15",
          startTime: "18:00",
          endTime: "23:00",
          serviceStaffCount: 5,
          juiceCount: 120,
          teaCount: 120,
          fireworkCount: 10,
          waterCount: 120,
          dinnerCount: 120,
          discount: 0,
          extraDetails: "نمونه قرارداد برای شروع",
          extraItems: [{ title: "نورپردازی اضافه", price: 500000 }],
          customerTotalCost: 10000000,
          myTotalCost: 7000000,
          status: "final",
          includeCandle: true,
          includeFlower: true,
          includeJuice: true,
          includeTea: true,
          includeFirework: true,
          includeWater: true,
          includeDinner: true,
        },
      ]);
    }
  }

  static async seedStudioContract() {
    const count = await StudioContract.countDocuments();
    if (count === 0) {
      await StudioContract.create([
        {
          fullName: "نمونه استودیو ۱",
          ceremonyType: "عروسی",
          invoiceDate: "1403/01/01",
          weddingDate: "1403/01/10",
          groomName: "علی",
          brideName: "سمیرا",
          services: [
            { name: "عکاسی", quantity: "1", price: "5000000", details: "" },
          ],
          totalPrice: "5000000",
          prePayment: "1000000",
        },
        {
          fullName: "نمونه استودیو ۲",
          ceremonyType: "عروسی",
          invoiceDate: "1403/02/01",
          weddingDate: "1403/02/12",
          groomName: "علی",
          brideName: "سمیرا",
          services: [
            { name: "عکاسی", quantity: "1", price: "6000000", details: "" },
          ],
          totalPrice: "6000000",
          prePayment: "1500000",
        },
        {
          fullName: "نمونه استودیو ۳",
          ceremonyType: "عروسی",
          invoiceDate: "1403/03/01",
          weddingDate: "1403/03/20",
          groomName: "علی",
          brideName: "سمیرا",
          services: [
            { name: "عکاسی", quantity: "1", price: "5500000", details: "" },
          ],
          totalPrice: "5500000",
          prePayment: "1200000",
        },
        {
          fullName: "نمونه استودیو ۴",
          ceremonyType: "عروسی",
          invoiceDate: "1403/04/01",
          weddingDate: "1403/04/15",
          groomName: "علی",
          brideName: "سمیرا",
          services: [
            { name: "عکاسی", quantity: "1", price: "6500000", details: "" },
          ],
          totalPrice: "6500000",
          prePayment: "2000000",
        },
        {
          fullName: "نمونه استودیو ۵",
          ceremonyType: "عروسی",
          invoiceDate: "1403/05/01",
          weddingDate: "1403/05/18",
          groomName: "علی",
          brideName: "سمیرا",
          services: [
            { name: "عکاسی", quantity: "1", price: "7000000", details: "" },
          ],
          totalPrice: "7000000",
          prePayment: "2500000",
        },
        {
          fullName: "نمونه استودیو ۶",
          ceremonyType: "عروسی",
          invoiceDate: "1403/06/01",
          weddingDate: "1403/06/22",
          groomName: "علی",
          brideName: "سمیرا",
          services: [
            { name: "عکاسی", quantity: "1", price: "7500000", details: "" },
          ],
          totalPrice: "7500000",
          prePayment: "3000000",
        },
      ]);
    }
  }

  static async seed() {
    try {
      await this.seedSettings();
      await this.seedContract();
      await this.seedStudioContract();
    } catch (err) {
      console.error("Error seeding sample data:", err.message);
    }
  }
}

// --- Helpers
const escapeRegExp = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const signAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
const signRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

const getTokenFromReq = (req) => {
  const hdr = req.header("x-auth-token");
  if (hdr) return hdr;
  const auth = req.header("authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
};

// --- Middlewares
const authMiddleware = (req, res, next) => {
  const token = getTokenFromReq(req);
  if (!token)
    return res.status(401).json({ message: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user; // { id, role }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// --- Routes
app.get("/healthz", (req, res) =>
  res.json({ ok: true, mongo: mongoConnected })
);

// Auth: login
app.post(
  "/api/auth/login",
  loginLimiter,
  celebrate({
    [Segments.BODY]: Joi.object({
      username: Joi.string().min(3).max(64).required(),
      password: Joi.string().min(6).max(128).required(),
    }),
  }),
  async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username });
      if (!user)
        return res.status(400).json({ message: "Invalid credentials" });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const payload = {
        user: { id: user.id, role: user.role, username: user.username },
      };
      const token = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await ActivityLog.create({
        user: user.username,
        method: req.method,
        endpoint: "/api/auth/login",
      });
      return res.json({
        token,
        refreshToken,
        role: user.role,
        allowedPages: user.allowedPages || [],
      });
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

// Auth: refresh (ورود مجدد با رفرش)
app.post(
  "/api/auth/refresh",
  celebrate({
    [Segments.BODY]: Joi.object({ refreshToken: Joi.string().required() }),
  }),
  (req, res) => {
    const { refreshToken } = req.body;
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const payload = { user: decoded.user };
      const token = signAccessToken(payload);
      return res.json({ token });
    } catch (e) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  }
);

// Users
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.json(users);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

app.post(
  "/api/users",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object({
      username: Joi.string().min(3).max(64).required(),
      password: Joi.string().min(6).max(128).required(),
      role: Joi.string().valid("admin", "user").default("user"),
      allowedPages: Joi.array().items(Joi.string()).default([]),
    }),
  }),
  async (req, res) => {
    const { username, password, role, allowedPages } = req.body;
    try {
      const exists = await User.findOne({ username });
      if (exists)
        return res.status(400).json({ message: "User already exists" });
      if (role === "admin") {
        const adminExists = await User.findOne({ role: "admin" });
        if (adminExists)
          return res.status(400).json({ message: "Admin user already exists" });
      }
      const user = new User({
        username,
        password,
        role,
        allowedPages: role === "admin" ? PAGE_NAMES : allowedPages,
      });
      await user.save();
      return res.status(201).json({ message: "User created successfully" });
    } catch (e) {
      console.error(e);
      if (e.code === 11000) {
        return res.status(400).json({ message: "User already exists" });
      }
      return res.status(500).send("Server error");
    }
  }
);

app.put(
  "/api/users/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().length(24).hex().required(),
    }),
    [Segments.BODY]: Joi.object({
      password: Joi.string().min(6).max(128),
      allowedPages: Joi.array().items(Joi.string()),
      role: Joi.string().valid("admin", "user"),
    }).or("password", "allowedPages", "role"),
  }),
  async (req, res) => {
    const { id } = req.params;
    const { password, allowedPages, role } = req.body;
    try {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
      if (role === "admin" && user.role !== "admin") {
        const adminExists = await User.findOne({
          role: "admin",
          _id: { $ne: id },
        });
        if (adminExists)
          return res.status(400).json({ message: "Admin user already exists" });
        user.role = "admin";
        if (allowedPages !== undefined) {
          user.allowedPages = allowedPages;
        } else {
          user.allowedPages = PAGE_NAMES;
        }
      } else if (role === "user" && user.role === "admin") {
        user.role = "user";
        if (allowedPages !== undefined) user.allowedPages = allowedPages;
      } else {
        if (allowedPages !== undefined) user.allowedPages = allowedPages;
      }
      await user.save();
      return res.json({ message: "User updated successfully" });
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.get("/api/logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(logs);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

// Settings
app.get(
  "/api/settings/:type",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object({
      type: Joi.string().valid("my", "customer").required(),
    }),
  }),
  async (req, res) => {
    const { type } = req.params;
    try {
      const Model = type === "my" ? MySettings : CustomerSettings;
      let settings = await Model.findOne();
      if (!settings) settings = await new Model({}).save();
      return res.json(settings);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.post(
  "/api/settings/:type",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object({
      type: Joi.string().valid("my", "customer").required(),
    }),
    [Segments.BODY]: Joi.object({
      defaultHourlyRate: Joi.number().min(0).default(0),
      defaultExtraHourPrice: Joi.number().min(0).default(0),
      defaultServiceFeePerPerson: Joi.number().min(0).default(0),
      defaultTaxRate: Joi.number().min(0).max(100).default(0),
      defaultJuicePricePerPerson: Joi.number().min(0).default(0),
      defaultTeaPricePerPerson: Joi.number().min(0).default(0),
      defaultFireworkPricePerUnit: Joi.number().min(0).default(0),
      defaultCandlePrice: Joi.number().min(0).default(0),
      defaultFlowerPrice: Joi.number().min(0).default(0),
      defaultWaterPricePerUnit: Joi.number().min(0).default(0),
      defaultDinnerPricePerPerson: Joi.number().min(0).default(0),
    }).unknown(false),
  }),
  async (req, res) => {
    const { type } = req.params;
    const body = req.body;
    try {
      const Model = type === "my" ? MySettings : CustomerSettings;
      const settings = await Model.findOneAndUpdate({}, body, {
        new: true,
        upsert: true,
      });
      return res.json(settings);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

// Studio Contracts
app.post(
  "/api/studio-contracts",
  authMiddleware,
  celebrate({ [Segments.BODY]: studioContractBodySchema }),
  async (req, res) => {
    try {
      const doc = await StudioContract.create(req.body);
      return res.status(201).json(doc);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.get("/api/studio-contracts", authMiddleware, async (req, res) => {
  try {
    const docs = await StudioContract.find({}).sort({ createdAt: -1 });
    return res.json(docs);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

app.get(
  "/api/studio-contracts/reporting",
  authMiddleware,
  async (req, res) => {
    try {
      const contracts = await StudioContract.find({});
      const report = {};
      const monthNames = [
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند",
      ];

      contracts.forEach((c) => {
        const dateStr =
          c.weddingDate || c.engagementDate || c.hennaDate || c.invoiceDate;
        if (!dateStr) return;
        const [year, month] = String(dateStr).split("/").map(Number);
        const monthKey = `${year}-${month}`;
        const monthName = `${monthNames[month - 1]} ${year}`;

        if (!report[monthKey]) {
          report[monthKey] = {
            monthName,
            contractCount: 0,
            totalPrice: 0,
          };
        }
        report[monthKey].contractCount += 1;
        report[monthKey].totalPrice += Number(c.totalPrice || 0);
      });

      const sortedData = Object.keys(report)
        .sort((a, b) => {
          const [yearA, monthA] = a.split("-").map(Number);
          const [yearB, monthB] = b.split("-").map(Number);
          if (yearA !== yearB) return yearA - yearB;
          return monthA - monthB;
        })
        .map((key) => report[key]);

      return res.json(sortedData);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.get("/api/studio-contracts/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await StudioContract.findById(req.params.id);
    if (!doc) return res.status(404).send("Not found");
    return res.json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

app.put(
  "/api/studio-contracts/:id",
  authMiddleware,
  celebrate({ [Segments.BODY]: studioContractBodySchema }),
  async (req, res) => {
    try {
      const updated = await StudioContract.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).send("Not found");
      return res.json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.delete("/api/studio-contracts/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await StudioContract.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send("Not found");
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

// Contracts
app.post(
  "/api/contracts",
  authMiddleware,
  celebrate({ [Segments.BODY]: contractBodySchema }),
  async (req, res) => {
    try {
      const newContract = new Contract(req.body);
      await newContract.save();
      return res.status(201).json(newContract);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.get(
  "/api/contracts/search",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object({
      searchTerm: Joi.string().allow("").default(""),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  }),
  async (req, res) => {
    const { searchTerm, page, limit } = req.query;
    try {
      const query = {};
      if (searchTerm) {
        const safe = escapeRegExp(searchTerm);
        query.$or = [
          { contractOwner: { $regex: safe, $options: "i" } },
          { eventDate: { $regex: safe, $options: "i" } },
        ];
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [contracts, totalCount] = await Promise.all([
        Contract.find(query).skip(skip).limit(Number(limit)),
        Contract.countDocuments(query),
      ]);
      return res.json({
        contracts,
        totalCount,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.get("/api/contracts/reporting", authMiddleware, async (req, res) => {
  try {
    const contracts = await Contract.find({});
    const report = {};
    const monthNames = [
      "فروردین",
      "اردیبهشت",
      "خرداد",
      "تیر",
      "مرداد",
      "شهریور",
      "مهر",
      "آبان",
      "آذر",
      "دی",
      "بهمن",
      "اسفند",
    ];

    contracts.forEach((c) => {
      const [year, month] = String(c.eventDate).split("/").map(Number);
      const monthKey = `${year}-${month}`;
      const monthName = `${monthNames[month - 1]} ${year}`;

      if (!report[monthKey]) {
        report[monthKey] = {
          monthName,
          contractCount: 0,
          customerTotal: 0,
          myTotal: 0,
        };
      }
      report[monthKey].contractCount += 1;
      report[monthKey].customerTotal += c.customerTotalCost;
      report[monthKey].myTotal += c.myTotalCost;
    });

    const sortedData = Object.keys(report)
      .sort((a, b) => {
        const [yearA, monthA] = a.split("-").map(Number);
        const [yearB, monthB] = b.split("-").map(Number);
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
      })
      .map((key) => report[key]);

    return res.json(sortedData);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

app.get("/api/contracts/:id", authMiddleware, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).send("Not found");
    return res.json(contract);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

app.put(
  "/api/contracts/:id",
  authMiddleware,
  celebrate({ [Segments.BODY]: contractBodySchema }),
  async (req, res) => {
    try {
      const updated = await Contract.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).send("Not found");
      return res.json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.patch(
  "/api/contracts/:id/status",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object({
      status: Joi.string()
        .valid("final", "reservation", "cancelled")
        .required(),
    }).unknown(false),
  }),
  async (req, res) => {
    try {
      const updated = await Contract.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      if (!updated) return res.status(404).send("Not found");
      return res.json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

app.delete("/api/contracts/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Contract.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send("Not found");
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

// خطایاب celebrate و خطایاب عمومی
app.use(celebrateErrors());
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Internal Server Error" });
});

// 404 برای مسیرهای تعریف‌نشده
app.use((req, res) => res.status(404).json({ message: "Not Found" }));

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
