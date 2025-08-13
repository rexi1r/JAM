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

// Rate limit عمومی
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Rate limit سخت‌گیرانه‌تر برای ورود
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
  "reporting",
  "userManagement",
  "createContract",
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

      const payload = { user: { id: user.id, role: user.role } };
      const token = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
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
        user.allowedPages = PAGE_NAMES;
      } else if (role === "user" && user.role === "admin") {
        user.role = "user";
        if (allowedPages) user.allowedPages = allowedPages;
      } else {
        if (allowedPages) user.allowedPages = allowedPages;
      }
      // ensure admin always has all pages including userManagement
      if (user.role === "admin") {
        user.allowedPages = PAGE_NAMES;
      }
      await user.save();
      return res.json({ message: "User updated successfully" });
    } catch (e) {
      console.error(e);
      return res.status(500).send("Server error");
    }
  }
);

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

// Contracts
app.post(
  "/api/contracts",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object({
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
    }).unknown(false),
  }),
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
