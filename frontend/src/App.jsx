import React, { useState, useEffect } from "react";
import { create } from "zustand";
import "./index.css";
import DatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";

// Shadcn UI components and Lucide-React for icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  User,
  Plus,
  FileText,
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  BarChart,
  Users,
  Key,
  RefreshCcw,
  Shield,
} from "lucide-react";

// ------------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------------
const API_BASE_URL = window.location.origin;

const PAGE_OPTIONS = [
  { key: "mySettings", label: "تنظیمات قیمت برای خودم" },
  { key: "customerSettings", label: "تنظیمات قیمت برای مشتری" },
  { key: "reporting", label: "گزارش‌گیری" },
  { key: "userManagement", label: "مدیریت کاربران" },
  { key: "createContract", label: "ثبت قرارداد جدید" },
];

// ------------------------------------------------------------------
// ZUSTAND STORE (fixed & expanded)
// - addContract added
// - updateMySettings/updateCustomerSettings added
// - token + refreshToken management
// ------------------------------------------------------------------
const useStore = create((set) => ({
  isLoggedIn: false,
  token: localStorage.getItem("token") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  allowedPages: JSON.parse(localStorage.getItem("allowedPages") || "[]"),
  role: localStorage.getItem("role") || "user",

  contracts: [],
  mySettings: null,
  customerSettings: null,
  users: [],

  login: (token, refreshToken, allowedPages = [], role = "user") => {
    if (token) localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("allowedPages", JSON.stringify(allowedPages));
    localStorage.setItem("role", role);
    set({ isLoggedIn: true, token, refreshToken, allowedPages, role });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("allowedPages");
    localStorage.removeItem("role");
    set({
      isLoggedIn: false,
      token: null,
      refreshToken: null,
      contracts: [],
      mySettings: null,
      customerSettings: null,
      users: [],
      allowedPages: [],
      role: "user",
    });
  },

  setContracts: (contracts) => set({ contracts }),
  addContract: (contract) =>
    set((s) => ({ contracts: [contract, ...s.contracts] })),

  setMySettings: (settings) => set({ mySettings: settings }),
  setCustomerSettings: (settings) => set({ customerSettings: settings }),

  updateMySettings: (settings) => set({ mySettings: settings }),
  updateCustomerSettings: (settings) => set({ customerSettings: settings }),

  setUsers: (users) => set({ users }),
  setAllowedPages: (allowedPages) => {
    localStorage.setItem("allowedPages", JSON.stringify(allowedPages));
    set({ allowedPages });
  },
}));

// ------------------------------------------------------------------
// API Helper with Auto Refresh
// - Sends Authorization: Bearer <token>
// - On 401, tries /api/auth/refresh once, then retries original request
// ------------------------------------------------------------------
const fetchWithAuth = async (url, options = {}) => {
  const state = useStore.getState();
  const token = state.token || localStorage.getItem("token");
  const refreshToken =
    state.refreshToken || localStorage.getItem("refreshToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const doFetch = async () => fetch(url, { ...options, headers });
  let response = await doFetch();

  if (response.status === 401 && refreshToken) {
    // try refresh once
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const { token: newToken } = await refreshRes.json();
        useStore
          .getState()
          .login(newToken, refreshToken, state.allowedPages, state.role);
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        useStore.getState().logout();
      }
    } catch (e) {
      useStore.getState().logout();
    }
  } else if (response.status === 401) {
    useStore.getState().logout();
  }

  return response;
};

// ------------------------------------------------------------------
// GLOBAL Modal & Utils (deduplicated)
// ------------------------------------------------------------------
const Modal = ({ title, children, onClose, onCopy }) => (
  <Dialog open={true} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[800px] max-w-[95%]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
      </DialogHeader>
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-y-auto max-h-[70vh]">
        {children}
      </div>
      <div className="flex justify-end gap-2">
        {onCopy && (
          <Button onClick={onCopy} variant="secondary">
            <Copy className="h-4 w-4 mr-2" /> کپی
          </Button>
        )}
        <Button onClick={onClose}>بستن</Button>
      </div>
    </DialogContent>
  </Dialog>
);

const copyToClipboard = (text) => {
  if (!text) return;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  alert("کپی شد!");
};

const sanitizeSettings = (settings) => {
  if (!settings) return {};
  const { _id, createdAt, updatedAt, __v, ...rest } = settings;
  return rest;
};

const to24Hour = (time) => {
  if (!time) return "";
  const match = time.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
  if (!match) return time;
  let [, hourStr, minute, meridiem] = match;
  let hour = parseInt(hourStr, 10);
  if (meridiem) {
    const lower = meridiem.toLowerCase();
    if (lower === "pm" && hour < 12) hour += 12;
    if (lower === "am" && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${minute}`;
};

const timeToDateObject = (time) => {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return new DateObject({ hour, minute, calendar: persian, locale: persian_fa });
};

const normalizeContractTimes = (contracts = []) =>
  contracts.map((c) => ({
    ...c,
    startTime: to24Hour(c.startTime),
    endTime: to24Hour(c.endTime),
  }));

// ------------------------------------------------------------------
// MAIN APP
// ------------------------------------------------------------------
export default function App() {
  const {
    isLoggedIn,
    login,
    logout,
    setContracts,
    setMySettings,
    setCustomerSettings,
    setUsers,
  } = useStore();
  const [currentPage, setCurrentPage] = useState("login");
  const [pageStack, setPageStack] = useState([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (message) => setErrorMessage(message);

  const navigate = (page) => {
    const allowed = useStore.getState().allowedPages || [];
    if (
      page !== "login" &&
      page !== "contractsList" &&
      allowed.length &&
      !allowed.includes(page)
    ) {
      showError("شما اجازه دسترسی به این صفحه را ندارید.");
      return;
    }
    setPageStack((s) => [...s, currentPage]);
    setCurrentPage(page);
  };

  const goBack = () => {
    setPageStack((s) => {
      const newStack = [...s];
      const prev = newStack.pop();
      if (prev) setCurrentPage(prev);
      return newStack;
    });
  };

  const handleLogout = () => {
    setPageStack([]);
    logout();
    setCurrentPage("login");
  };

  const BackButton = () =>
    pageStack.length > 0 && currentPage !== "contractsList" ? (
      <Button
        onClick={goBack}
        variant="ghost"
        className="flex items-center gap-1 text-primary hover:text-primary/80"
      >
        <ChevronRight className="h-4 w-4" /> بازگشت
      </Button>
    ) : null;

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refreshToken");
      const pages = JSON.parse(localStorage.getItem("allowedPages") || "[]");
      const role = localStorage.getItem("role") || "user";
      if (token && refreshToken) {
        login(token, refreshToken, pages, role);
        await fetchAllData();
        setCurrentPage("contractsList");
      }
      setLoadingInitialData(false);
    };
    bootstrap();
  }, []);

  const fetchAllData = async () => {
    try {
      const mySettingsRes = await fetchWithAuth(
        `${API_BASE_URL}/api/settings/my`
      );
      if (mySettingsRes.ok) {
        const mySettings = sanitizeSettings(await mySettingsRes.json());
        useStore.getState().setMySettings(mySettings);
      } else {
        showError("خطا در دریافت تنظیمات قیمت برای خودم.");
      }

      const customerSettingsRes = await fetchWithAuth(
        `${API_BASE_URL}/api/settings/customer`
      );
      if (customerSettingsRes.ok) {
        const customerSettings = sanitizeSettings(
          await customerSettingsRes.json()
        );
        useStore.getState().setCustomerSettings(customerSettings);
      } else {
        showError("خطا در دریافت تنظیمات قیمت برای مشتری.");
      }

      const contractsRes = await fetchWithAuth(
        `${API_BASE_URL}/api/contracts/search`
      );
      if (contractsRes.ok) {
        const contractsData = await contractsRes.json();
        useStore
          .getState()
          .setContracts(normalizeContractTimes(contractsData.contracts || []));
      } else {
        showError("خطا در دریافت لیست قراردادها.");
      }

      const allowed = useStore.getState().allowedPages || [];
      if (allowed.includes("userManagement")) {
        const usersRes = await fetchWithAuth(`${API_BASE_URL}/api/users`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          useStore.getState().setUsers(usersData || []);
        } else {
          showError("خطا در دریافت کاربران.");
        }
      }
    } catch (e) {
      console.error("Failed to fetch initial data:", e);
    }
  };

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [pending, setPending] = useState(false);

    const handleLogin = async (e) => {
      e.preventDefault();
      setPending(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok) {
          // store access & refresh
          localStorage.setItem("token", data.token);
          localStorage.setItem("refreshToken", data.refreshToken);
          login(
            data.token,
            data.refreshToken,
            data.allowedPages || [],
            data.role
          );
          await fetchAllData();
          navigate("contractsList");
        } else {
          showError(data.message || "اعتبارسنجی ناموفق");
        }
      } catch (e) {
        showError("Server error. Please try again.");
      } finally {
        setPending(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <BackButton />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              ورود
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder=""
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">کلمه عبور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> در حال
                      ورود...
                    </>
                  ) : (
                    "ورود"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Settings (works with update* actions now)
  // ------------------------------------------------------------------
  const SettingsPage = ({ title, settingsType }) => {
    const {
      mySettings,
      customerSettings,
      updateMySettings,
      updateCustomerSettings,
    } = useStore();
    const rawSettings = settingsType === "my" ? mySettings : customerSettings;
    const initialSettings = sanitizeSettings(rawSettings);
    const updateSettings =
      settingsType === "my" ? updateMySettings : updateCustomerSettings;
    const [localSettings, setLocalSettings] = useState(initialSettings || {});

    useEffect(() => {
      setLocalSettings(sanitizeSettings(rawSettings) || {});
    }, [rawSettings]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      const parsedValue = parseFloat(value);
      if (parsedValue < 0) return;
      setLocalSettings((prev) => ({ ...prev, [name]: parsedValue || 0 }));
    };

    const handleSave = async () => {
      try {
        const payload = sanitizeSettings(localSettings);
        const res = await fetchWithAuth(
          `${API_BASE_URL}/api/settings/${settingsType}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        if (res.ok) {
          updateSettings(payload);
          navigate("contractsList");
          alert("تنظیمات با موفقیت ذخیره شد.");
        } else {
          const t = await res.text();
          showError(t || "خطا در ذخیره تنظیمات.");
        }
      } catch (e) {
        showError("خطای سرور.");
      }
    };

    return (
      <div className="container mx-auto p-8 bg-gray-50 min-h-screen font-iransans">
        <BackButton />
        <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-800">
          {title}
        </h1>
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {Object.keys(localSettings).map((key) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={key}>
                    {{
                      defaultHourlyRate: "مبلغ ورودی ساعتی (تومان)",
                      defaultServiceFeePerPerson:
                        "حق سرویس هر نفر خدمه (تومان)",
                      defaultTaxRate: "نرخ مالیات (٪)",
                      defaultJuicePricePerPerson: "قیمت آبمیوه هر نفر (تومان)",
                      defaultTeaPricePerPerson: "قیمت چایی هر نفر (تومان)",
                      defaultFireworkPricePerUnit:
                        "قیمت آتش‌بازی هر عدد (تومان)",
                      defaultCandlePrice: "هزینه شمع‌آرایی (تومان)",
                      defaultFlowerPrice: "هزینه گل‌آرایی (تومان)",
                      defaultWaterPricePerUnit: "قیمت آب معدنی هر عدد (تومان)",
                      defaultDinnerPricePerPerson: "قیمت شام هر نفر (تومان)",
                    }[key] || key}
                  </Label>
                  <Input
                    type="number"
                    name={key}
                    value={localSettings[key]}
                    onChange={handleChange}
                    id={key}
                    min="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              <Button onClick={handleSave}>ذخیره تنظیمات</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Create Contract
  // ------------------------------------------------------------------
  const CreateContract = () => {
    const { mySettings, customerSettings, addContract, role } = useStore();
    const isAdmin = role === "admin";

    const [contract, setContract] = useState({
      contractOwner: "",
      groomFirstName: "",
      groomLastName: "",
      groomNationalId: "",
      spouseFirstName: "",
      spouseLastName: "",
      spouseNationalId: "",
      address: "",
      phone: "",
      email: "",
      inviteesCount: 0,
      eventDate: "",
      startTime: "",
      endTime: "",
      serviceStaffCount: 0,
      juiceCount: 0,
      teaCount: 0,
      fireworkCount: 0,
      waterCount: 0,
      dinnerCount: 0,
      dinnerType: "",
      discount: 0,
      extraDetails: "",
      extraItems: [],
      customerEntryFee: "",
      customerServiceFee: "",
      customerTax: "",
      customerJuicePrice: "",
      customerTeaPrice: "",
      customerFireworkPrice: "",
      customerCandlePrice: "",
      customerFlowerPrice: "",
      customerDinnerPrice: "",
      customerWaterPrice: "",
      customerTotalCost: 0,
      myEntryFee: "",
      myServiceFee: "",
      myTax: "",
      myJuicePrice: "",
      myTeaPrice: "",
      myFireworkPrice: "",
      myCandlePrice: "",
      myFlowerPrice: "",
      myDinnerPrice: "",
      myWaterPrice: "",
      myTotalCost: 0,
      status: "reservation",
      includeCandle: false,
      includeFlower: false,
      includeJuice: false,
      includeTea: false,
      includeFirework: false,
      includeWater: false,
      includeDinner: false,
    });

    const [overridden, setOverridden] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [generatedDraft, setGeneratedDraft] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);

    const handleChange = (e) => {
      const { name, value, type } = e.target;
      const parsedValue = parseFloat(value);
      if (type === "number" && parsedValue < 0) return;
      if (
        name.includes("Count") ||
        name.includes("Type") ||
        name.includes("Time") ||
        name === "discount"
      ) {
        setOverridden((prev) => {
          const o = { ...prev };
          if (name === "serviceStaffCount") {
            o.customerServiceFee = false;
            o.myServiceFee = false;
          }
          if (name === "juiceCount") {
            o.customerJuicePrice = false;
            o.myJuicePrice = false;
          }
          if (name === "teaCount") {
            o.customerTeaPrice = false;
            o.myTeaPrice = false;
          }
          if (name === "fireworkCount") {
            o.customerFireworkPrice = false;
            o.myFireworkPrice = false;
          }
          if (name === "waterCount") {
            o.customerWaterPrice = false;
            o.myWaterPrice = false;
          }
          if (name === "dinnerCount" || name === "dinnerType") {
            o.customerDinnerPrice = false;
            o.myDinnerPrice = false;
          }
          if (name.includes("Time")) {
            o.customerEntryFee = false;
            o.myEntryFee = false;
          }
          return o;
        });
      }
      let finalValue = type === "number" ? parsedValue : value;
      if (name.includes("Time")) {
        finalValue = to24Hour(finalValue);
      }
      setContract((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    };

    const handleEventDateChange = (date) => {
      setContract((prev) => ({
        ...prev,
        eventDate: date ? date.format("YYYY/MM/DD") : "",
      }));
    };

    const handleCheckboxChange = (name, checked) => {
      setContract((prev) => ({ ...prev, [name]: checked }));
    };

    const handlePriceChange = (e) => {
      const { name, value, type } = e.target;
      const parsedValue = parseFloat(value);
      if (type === "number" && parsedValue < 0) return;
      setOverridden((prev) => ({ ...prev, [name]: true }));
      setContract((prev) => ({ ...prev, [name]: parsedValue }));
    };

    const addExtraItem = () => {
      setContract((prev) => ({
        ...prev,
        extraItems: [...prev.extraItems, { title: "", price: 0 }],
      }));
    };

    const handleExtraItemChange = (index, field, value) => {
      setContract((prev) => {
        const items = [...prev.extraItems];
        const val =
          field === "price" ? Math.max(0, parseFloat(value) || 0) : value;
        items[index] = { ...items[index], [field]: val };
        return { ...prev, extraItems: items };
      });
    };

    const removeExtraItem = (index) => {
      setContract((prev) => {
        const items = [...prev.extraItems];
        items.splice(index, 1);
        return { ...prev, extraItems: items };
      });
    };

    const calculateEntryFee = (start, end, rate) => {
      if (!start || !end || !start.includes(":") || !end.includes(":"))
        return rate;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const startDate = new Date(0, 0, 0, sh, sm);
      const endDate = new Date(0, 0, 0, eh, em);
      const diffInHours =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      if (diffInHours <= 2) return rate;
      const extraHours = diffInHours - 2;
      return rate + extraHours * (rate / 2);
    };

    useEffect(() => {
      const next = { ...contract };
      if (mySettings && customerSettings) {
        if (!overridden.customerEntryFee)
          next.customerEntryFee = calculateEntryFee(
            next.startTime,
            next.endTime,
            customerSettings.defaultHourlyRate
          );
        if (!overridden.customerServiceFee)
          next.customerServiceFee =
            next.serviceStaffCount *
            customerSettings.defaultServiceFeePerPerson;
        if (next.includeJuice && !overridden.customerJuicePrice)
          next.customerJuicePrice =
            next.juiceCount * customerSettings.defaultJuicePricePerPerson;
        else if (!next.includeJuice) next.customerJuicePrice = 0;
        if (next.includeTea && !overridden.customerTeaPrice)
          next.customerTeaPrice =
            next.teaCount * customerSettings.defaultTeaPricePerPerson;
        else if (!next.includeTea) next.customerTeaPrice = 0;
        if (next.includeFirework && !overridden.customerFireworkPrice)
          next.customerFireworkPrice =
            next.fireworkCount * customerSettings.defaultFireworkPricePerUnit;
        else if (!next.includeFirework) next.customerFireworkPrice = 0;
        if (next.includeCandle && !overridden.customerCandlePrice)
          next.customerCandlePrice = customerSettings.defaultCandlePrice;
        else if (!next.includeCandle) next.customerCandlePrice = 0;
        if (next.includeFlower && !overridden.customerFlowerPrice)
          next.customerFlowerPrice = customerSettings.defaultFlowerPrice;
        else if (!next.includeFlower) next.customerFlowerPrice = 0;
        if (next.includeWater && !overridden.customerWaterPrice)
          next.customerWaterPrice =
            next.waterCount * customerSettings.defaultWaterPricePerUnit;
        else if (!next.includeWater) next.customerWaterPrice = 0;
        if (next.includeDinner && !overridden.customerDinnerPrice)
          next.customerDinnerPrice =
            next.dinnerCount * customerSettings.defaultDinnerPricePerPerson;
        else if (!next.includeDinner) next.customerDinnerPrice = 0;

        const extraItemsTotal = (next.extraItems || []).reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0),
          0
        );

        const customerTotalWithoutTax =
          (next.customerEntryFee || 0) +
          (next.customerServiceFee || 0) +
          (next.customerJuicePrice || 0) +
          (next.customerTeaPrice || 0) +
          (next.customerFireworkPrice || 0) +
          (next.customerCandlePrice || 0) +
          (next.customerFlowerPrice || 0) +
          (next.customerDinnerPrice || 0) +
          (next.customerWaterPrice || 0) +
          extraItemsTotal -
          (parseFloat(next.discount) || 0);
        next.customerTax =
          customerTotalWithoutTax * customerSettings.defaultTaxRate;
        next.customerTotalCost = customerTotalWithoutTax + next.customerTax;

        if (!overridden.myEntryFee)
          next.myEntryFee = calculateEntryFee(
            next.startTime,
            next.endTime,
            mySettings.defaultHourlyRate
          );
        if (!overridden.myServiceFee)
          next.myServiceFee =
            next.serviceStaffCount * mySettings.defaultServiceFeePerPerson;
        if (next.includeJuice && !overridden.myJuicePrice)
          next.myJuicePrice =
            next.juiceCount * mySettings.defaultJuicePricePerPerson;
        else if (!next.includeJuice) next.myJuicePrice = 0;
        if (next.includeTea && !overridden.myTeaPrice)
          next.myTeaPrice = next.teaCount * mySettings.defaultTeaPricePerPerson;
        else if (!next.includeTea) next.myTeaPrice = 0;
        if (next.includeFirework && !overridden.myFireworkPrice)
          next.myFireworkPrice =
            next.fireworkCount * mySettings.defaultFireworkPricePerUnit;
        else if (!next.includeFirework) next.myFireworkPrice = 0;
        if (next.includeCandle && !overridden.myCandlePrice)
          next.myCandlePrice = mySettings.defaultCandlePrice;
        else if (!next.includeCandle) next.myCandlePrice = 0;
        if (next.includeFlower && !overridden.myFlowerPrice)
          next.myFlowerPrice = mySettings.defaultFlowerPrice;
        else if (!next.includeFlower) next.myFlowerPrice = 0;
        if (next.includeWater && !overridden.myWaterPrice)
          next.myWaterPrice =
            next.waterCount * mySettings.defaultWaterPricePerUnit;
        else if (!next.includeWater) next.myWaterPrice = 0;
        if (next.includeDinner && !overridden.myDinnerPrice)
          next.myDinnerPrice =
            next.dinnerCount * mySettings.defaultDinnerPricePerPerson;
        else if (!next.includeDinner) next.myDinnerPrice = 0;

        const myTotalWithoutTax =
          (next.myEntryFee || 0) +
          (next.myServiceFee || 0) +
          (next.myJuicePrice || 0) +
          (next.myTeaPrice || 0) +
          (next.myFireworkPrice || 0) +
          (next.myCandlePrice || 0) +
          (next.myFlowerPrice || 0) +
          (next.myDinnerPrice || 0) +
          (next.myWaterPrice || 0) +
          extraItemsTotal -
          (parseFloat(next.discount) || 0);
        next.myTax = myTotalWithoutTax * mySettings.defaultTaxRate;
        next.myTotalCost = myTotalWithoutTax + next.myTax;
      }
      setContract(next);
    }, [
      contract.startTime,
      contract.endTime,
      contract.serviceStaffCount,
      contract.inviteesCount,
      contract.juiceCount,
      contract.teaCount,
      contract.fireworkCount,
      contract.waterCount,
      contract.dinnerCount,
      contract.discount,
      contract.extraItems,
      contract.includeCandle,
      contract.includeFlower,
      contract.includeJuice,
      contract.includeTea,
      contract.includeFirework,
      contract.includeWater,
      contract.includeDinner,
      customerSettings,
      mySettings,
      overridden,
    ]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        const payload = {
          ...contract,
          startTime: to24Hour(contract.startTime),
          endTime: to24Hour(contract.endTime),
        };
        const res = await fetchWithAuth(`${API_BASE_URL}/api/contracts`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const newContract = await res.json();
          addContract({
            ...newContract,
            startTime: to24Hour(newContract.startTime),
            endTime: to24Hour(newContract.endTime),
          });
          navigate("contractsList");
          alert("قرارداد با موفقیت ثبت شد.");
        } else {
          const t = await res.text();
          showError(t || "خطا در ثبت قرارداد.");
        }
      } catch (e) {
        showError("خطای سرور.");
      } finally {
        setIsSaving(false);
      }
    };

    // NOTE: For security, this feature must be implemented via backend proxy
    const generateOfferLetter = async () => {
      showError(
        "این قابلیت باید از طریق بک‌اند امن پیاده‌سازی شود (کلید API در فرانت نگهداری نمی‌شود)."
      );
    };

    return (
      <div className="container mx-auto p-8 min-h-screen font-iransans">
        <BackButton />
        <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-800">
          ثبت قرارداد جدید
        </h1>
        <Card className="max-w-6xl mx-auto">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-8 mb-8">
                <div>
                  <h2 className="text-xl font-bold mb-4 border-b pb-2">
                    اطلاعات کلی قرارداد
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="grid gap-2">
                      <Label htmlFor="contractOwner">نام صاحب قرارداد</Label>
                      <Input
                        type="text"
                        id="contractOwner"
                        name="contractOwner"
                        value={contract.contractOwner}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="groomFirstName">نام داماد</Label>
                      <Input
                        type="text"
                        id="groomFirstName"
                        name="groomFirstName"
                        value={contract.groomFirstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="groomLastName">نام خانوادگی داماد</Label>
                      <Input
                        type="text"
                        id="groomLastName"
                        name="groomLastName"
                        value={contract.groomLastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="groomNationalId">کد ملی داماد</Label>
                      <Input
                        type="text"
                        id="groomNationalId"
                        name="groomNationalId"
                        value={contract.groomNationalId}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="spouseFirstName">نام همسر</Label>
                      <Input
                        type="text"
                        id="spouseFirstName"
                        name="spouseFirstName"
                        value={contract.spouseFirstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="spouseLastName">نام خانوادگی همسر</Label>
                      <Input
                        type="text"
                        id="spouseLastName"
                        name="spouseLastName"
                        value={contract.spouseLastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="spouseNationalId">کد ملی همسر</Label>
                      <Input
                        type="text"
                        id="spouseNationalId"
                        name="spouseNationalId"
                        value={contract.spouseNationalId}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">آدرس</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={contract.address}
                        onChange={handleChange}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">شماره تماس</Label>
                      <Input
                        type="text"
                        id="phone"
                        name="phone"
                        value={contract.phone}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">ایمیل</Label>
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        value={contract.email}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="inviteesCount">تعداد مهمان</Label>
                      <Input
                        type="number"
                        id="inviteesCount"
                        name="inviteesCount"
                        value={contract.inviteesCount}
                        onChange={handleChange}
                        required
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2">
                    تاریخ مراسم
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="grid gap-2">
                      <Label htmlFor="eventDate">تاریخ برگزاری (شمسی)</Label>
                      <DatePicker
                        calendar={persian}
                        locale={persian_fa}
                        value={contract.eventDate}
                        onChange={handleEventDateChange}
                        format="YYYY/MM/DD"
                        containerClassName="w-full"
                        inputClass="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                        inputProps={{
                          id: "eventDate",
                          name: "eventDate",
                          required: true,
                          placeholder: "مثال: ۱۴۰۳/۰۴/۱۷",
                        }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">ساعت شروع</Label>
                      <DatePicker
                        disableDayPicker
                        format="HH:mm"
                        calendar={persian}
                        locale={persian_fa}
                        plugins={[<TimePicker hideSeconds />]}
                        value={timeToDateObject(contract.startTime)}
                        onChange={(value) =>
                          handleChange({
                            target: {
                              name: "startTime",
                              value: value?.format("HH:mm") || "",
                              type: "time",
                            },
                          })
                        }
                        containerClassName="w-full"
                        inputClass="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                        inputProps={{ id: "startTime", name: "startTime", required: true }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime">ساعت پایان</Label>
                      <DatePicker
                        disableDayPicker
                        format="HH:mm"
                        calendar={persian}
                        locale={persian_fa}
                        plugins={[<TimePicker hideSeconds />]}
                        value={timeToDateObject(contract.endTime)}
                        onChange={(value) =>
                          handleChange({
                            target: {
                              name: "endTime",
                              value: value?.format("HH:mm") || "",
                              type: "time",
                            },
                          })
                        }
                        containerClassName="w-full"
                        inputClass="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                        inputProps={{ id: "endTime", name: "endTime", required: true }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2">
                    هزینه‌های ورودی و خدمه
                  </h2>
                  <div
                    className={`grid grid-cols-1 gap-8 ${isAdmin ? "md:grid-cols-2" : ""}`}
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="customerEntryFee">
                        مبلغ ورودی (مشتری)
                      </Label>
                      <Input
                        type="number"
                        id="customerEntryFee"
                        name="customerEntryFee"
                        value={contract.customerEntryFee}
                        onChange={handlePriceChange}
                        min="0"
                      />
                    </div>
                    <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                      <Label htmlFor="myEntryFee">مبلغ ورودی (خودم)</Label>
                      <Input
                        type="number"
                        id="myEntryFee"
                        name="myEntryFee"
                        value={contract.myEntryFee}
                        onChange={handlePriceChange}
                        min="0"
                      />
                    </div>
                  </div>
                  <div
                    className={`grid grid-cols-1 gap-8 mt-4 ${
                      isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                    }`}
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="serviceStaffCount">
                        تعداد خدمه مورد استفاده
                      </Label>
                      <Input
                        type="number"
                        id="serviceStaffCount"
                        name="serviceStaffCount"
                        value={contract.serviceStaffCount}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customerServiceFee">
                        حق سرویس (مشتری)
                      </Label>
                      <Input
                        type="number"
                        id="customerServiceFee"
                        name="customerServiceFee"
                        value={contract.customerServiceFee}
                        onChange={handlePriceChange}
                        min="0"
                      />
                    </div>
                    <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                      <Label htmlFor="myServiceFee">حق سرویس (خودم)</Label>
                      <Input
                        type="number"
                        id="myServiceFee"
                        name="myServiceFee"
                        value={contract.myServiceFee}
                        onChange={handlePriceChange}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Drinks */}
                <div>
                  <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2">
                    نوشیدنی‌ها
                  </h2>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="includeJuice"
                      checked={contract.includeJuice}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeJuice", checked)
                      }
                    />
                    <Label htmlFor="includeJuice">شامل آبمیوه</Label>
                  </div>
                  {contract.includeJuice && (
                    <div
                      className={`grid grid-cols-1 gap-8 ${
                        isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="juiceCount">تعداد آبمیوه</Label>
                        <Input
                          type="number"
                          id="juiceCount"
                          name="juiceCount"
                          value={contract.juiceCount}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customerJuicePrice">
                          قیمت آبمیوه (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerJuicePrice"
                          name="customerJuicePrice"
                          value={contract.customerJuicePrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myJuicePrice">قیمت آبمیوه (خودم)</Label>
                        <Input
                          type="number"
                          id="myJuicePrice"
                          name="myJuicePrice"
                          value={contract.myJuicePrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mt-4 mb-4">
                    <Checkbox
                      id="includeTea"
                      checked={contract.includeTea}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeTea", checked)
                      }
                    />
                    <Label htmlFor="includeTea">شامل چایی</Label>
                  </div>
                  {contract.includeTea && (
                    <div
                      className={`grid grid-cols-1 gap-8 ${
                        isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="teaCount">تعداد چایی</Label>
                        <Input
                          type="number"
                          id="teaCount"
                          name="teaCount"
                          value={contract.teaCount}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customerTeaPrice">
                          قیمت چایی (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerTeaPrice"
                          name="customerTeaPrice"
                          value={contract.customerTeaPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myTeaPrice">قیمت چایی (خودم)</Label>
                        <Input
                          type="number"
                          id="myTeaPrice"
                          name="myTeaPrice"
                          value={contract.myTeaPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mt-4 mb-4">
                    <Checkbox
                      id="includeWater"
                      checked={contract.includeWater}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeWater", checked)
                      }
                    />
                    <Label htmlFor="includeWater">شامل آب معدنی</Label>
                  </div>
                  {contract.includeWater && (
                    <div
                      className={`grid grid-cols-1 gap-8 ${
                        isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="waterCount">تعداد آب معدنی</Label>
                        <Input
                          type="number"
                          id="waterCount"
                          name="waterCount"
                          value={contract.waterCount}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customerWaterPrice">
                          قیمت آب معدنی (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerWaterPrice"
                          name="customerWaterPrice"
                          value={contract.customerWaterPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myWaterPrice">
                          قیمت آب معدنی (خودم)
                        </Label>
                        <Input
                          type="number"
                          id="myWaterPrice"
                          name="myWaterPrice"
                          value={contract.myWaterPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Dinner */}
                <div>
                  <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2">
                    شام
                  </h2>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="includeDinner"
                      checked={contract.includeDinner}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeDinner", checked)
                      }
                    />
                    <Label htmlFor="includeDinner">شامل شام</Label>
                  </div>
                  {contract.includeDinner && (
                    <div
                      className={`grid grid-cols-1 gap-8 ${
                        isAdmin ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="dinnerType">نوع شام</Label>
                        <Input
                          type="text"
                          id="dinnerType"
                          name="dinnerType"
                          value={contract.dinnerType}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dinnerCount">تعداد شام</Label>
                        <Input
                          type="number"
                          id="dinnerCount"
                          name="dinnerCount"
                          value={contract.dinnerCount}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customerDinnerPrice">
                          قیمت شام (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerDinnerPrice"
                          name="customerDinnerPrice"
                          value={contract.customerDinnerPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myDinnerPrice">قیمت شام (خودم)</Label>
                        <Input
                          type="number"
                          id="myDinnerPrice"
                          name="myDinnerPrice"
                          value={contract.myDinnerPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Decorations & Firework */}
                <div>
                  <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2">
                    تزیینات و آتش‌بازی
                  </h2>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="includeCandle"
                      checked={contract.includeCandle}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeCandle", checked)
                      }
                    />
                    <Label htmlFor="includeCandle">شامل شمع‌آرایی</Label>
                  </div>
                  {contract.includeCandle && (
                    <div
                      className={`grid grid-cols-1 gap-8 mb-4 ${
                        isAdmin ? "md:grid-cols-2" : ""
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="customerCandlePrice">
                          هزینه شمع‌آرایی (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerCandlePrice"
                          name="customerCandlePrice"
                          value={contract.customerCandlePrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myCandlePrice">
                          هزینه شمع‌آرایی (خودم)
                        </Label>
                        <Input
                          type="number"
                          id="myCandlePrice"
                          name="myCandlePrice"
                          value={contract.myCandlePrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="includeFlower"
                      checked={contract.includeFlower}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeFlower", checked)
                      }
                    />
                    <Label htmlFor="includeFlower">شامل گل‌آرایی</Label>
                  </div>
                  {contract.includeFlower && (
                    <div
                      className={`grid grid-cols-1 gap-8 mb-4 ${
                        isAdmin ? "md:grid-cols-2" : ""
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="customerFlowerPrice">
                          هزینه گل‌آرایی (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerFlowerPrice"
                          name="customerFlowerPrice"
                          value={contract.customerFlowerPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myFlowerPrice">
                          هزینه گل‌آرایی (خودم)
                        </Label>
                        <Input
                          type="number"
                          id="myFlowerPrice"
                          name="myFlowerPrice"
                          value={contract.myFlowerPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="includeFirework"
                      checked={contract.includeFirework}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("includeFirework", checked)
                      }
                    />
                    <Label htmlFor="includeFirework">شامل آتش‌بازی</Label>
                  </div>
                  {contract.includeFirework && (
                    <div
                      className={`grid grid-cols-1 gap-8 ${
                        isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                      }`}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="fireworkCount">تعداد آتش‌بازی</Label>
                        <Input
                          type="number"
                          id="fireworkCount"
                          name="fireworkCount"
                          value={contract.fireworkCount}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customerFireworkPrice">
                          قیمت آتش‌بازی (مشتری)
                        </Label>
                        <Input
                          type="number"
                          id="customerFireworkPrice"
                          name="customerFireworkPrice"
                          value={contract.customerFireworkPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                      <div className={`grid gap-2 ${!isAdmin && "hidden"}`}>
                        <Label htmlFor="myFireworkPrice">
                          قیمت آتش‌بازی (خودم)
                        </Label>
                        <Input
                          type="number"
                          id="myFireworkPrice"
                          name="myFireworkPrice"
                          value={contract.myFireworkPrice}
                          onChange={handlePriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2">
                  نهایی و توضیحات
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="grid gap-2">
                    <Label htmlFor="discount">تخفیف (تومان)</Label>
                    <Input
                      type="number"
                      id="discount"
                      name="discount"
                      value={contract.discount}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>
                  <div className="grid gap-2 col-span-1 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="extraDetails">توضیحات اضافه</Label>
                    <Textarea
                      id="extraDetails"
                      name="extraDetails"
                      value={contract.extraDetails}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="font-bold mb-2">آیتم‌های اضافی</h3>
                  {contract.extraItems.map((item, idx) => (
                    <div key={idx} className="flex items-end gap-2 mb-2">
                      <div className="flex-1">
                        <Label className="block mb-1">عنوان</Label>
                        <Input
                          placeholder="عنوان"
                          value={item.title}
                          onChange={(e) =>
                            handleExtraItemChange(idx, "title", e.target.value)
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1 max-w-[200px]">
                        <Label className="block mb-1">قیمت</Label>
                        <Input
                          type="number"
                          placeholder="قیمت"
                          value={item.price}
                          onChange={(e) =>
                            handleExtraItemChange(idx, "price", e.target.value)
                          }
                          className="w-full"
                          min="0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeExtraItem(idx)}
                      >
                        حذف
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addExtraItem}
                    className="mt-2"
                  >
                    افزودن آیتم
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-100 mt-8 flex-wrap">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl font-bold text-gray-800">
                    مبلغ نهایی مشتری:{" "}
                    {contract.customerTotalCost.toLocaleString("fa-IR")} تومان
                  </div>
                  <div
                    className={`text-2xl font-bold text-gray-800 ${
                      !isAdmin && "hidden"
                    }`}
                  >
                    مبلغ نهایی خودم:{" "}
                    {contract.myTotalCost.toLocaleString("fa-IR")} تومان
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={generateOfferLetter}
                    disabled
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <span>پیش‌نویس نامه پیشنهاد (به‌زودی از بک‌اند)</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 sm:mt-0 items-center">
                  <select
                    name="status"
                    value={contract.status}
                    onChange={handleChange}
                    className="border rounded px-3 py-2"
                  >
                    <option value="final">نهایی</option>
                    <option value="reservation">رزرو</option>
                    <option value="cancelled">کنسل</option>
                  </select>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "در حال ذخیره..." : "ثبت قرارداد"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Contracts List
  // ------------------------------------------------------------------
  const ContractsList = () => {
    const contracts = useStore((state) => state.contracts);
    const allowedPages = useStore((state) => state.allowedPages);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const contractsPerPage = 5;

    const filteredContracts = contracts.filter(
      (c) =>
        (c.contractOwner || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (c.eventDate || "").includes(searchTerm)
    );

    const indexOfLastContract = currentPageNumber * contractsPerPage;
    const indexOfFirstContract = indexOfLastContract - contractsPerPage;
    const currentContracts = filteredContracts.slice(
      indexOfFirstContract,
      indexOfLastContract
    );
    const totalPages =
      Math.ceil(filteredContracts.length / contractsPerPage) || 1;

    return (
      <div className="container mx-auto p-8 min-h-screen font-iransans">
        <BackButton />
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">
            لیست قراردادها
          </h1>
          <div className="flex gap-2">
            <Button onClick={fetchAllData} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              به‌روزرسانی
            </Button>
            <Button onClick={handleLogout} variant="destructive">
              خروج
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3"
                placeholder="جستجو بر اساس نام یا تاریخ..."
              />
              <div className="flex flex-wrap gap-2">
                {allowedPages.includes("mySettings") && (
                  <Button
                    onClick={() => navigate("mySettings")}
                    variant="secondary"
                  >
                    <Settings className="h-4 w-4 mr-2" /> تنظیمات قیمت برای خودم
                  </Button>
                )}
                {allowedPages.includes("customerSettings") && (
                  <Button
                    onClick={() => navigate("customerSettings")}
                    variant="secondary"
                  >
                    <User className="h-4 w-4 mr-2" /> تنظیمات قیمت برای مشتری
                  </Button>
                )}
                {allowedPages.includes("reporting") && (
                  <Button
                    onClick={() => navigate("reporting")}
                    variant="secondary"
                  >
                    <BarChart className="h-4 w-4 mr-2" /> گزارش‌گیری
                  </Button>
                )}
                {allowedPages.includes("userManagement") && (
                  <Button
                    onClick={() => navigate("userManagement")}
                    variant="secondary"
                  >
                    <Users className="h-4 w-4 mr-2" /> مدیریت کاربران
                  </Button>
                )}
                {allowedPages.includes("createContract") && (
                  <Button onClick={() => navigate("createContract")}>
                    <Plus className="h-4 w-4 mr-2" /> ثبت قرارداد جدید
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">
                      نام صاحب قرارداد
                    </TableHead>
                    <TableHead className="text-right">تاریخ</TableHead>
                    <TableHead className="text-right">مبلغ نهایی</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentContracts.length > 0 ? (
                    currentContracts.map((c) => (
                      <TableRow key={c._id || c.id}>
                        <TableCell>{c.contractOwner}</TableCell>
                        <TableCell>{c.eventDate}</TableCell>
                        <TableCell>
                          {Number(c.customerTotalCost || 0).toLocaleString(
                            "fa-IR"
                          )}{" "}
                          تومان
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 ml-2" /> مشاهده جزئیات
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] max-w-[95%]">
                              <DialogHeader>
                                <DialogTitle>
                                  جزئیات قرارداد: {c.contractOwner}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                                <div className="space-y-2">
                                  <h4 className="font-semibold border-b pb-1">
                                    اطلاعات کلی
                                  </h4>
                                  <p>
                                    <strong>نام داماد:</strong>{" "}
                                    {c.groomFirstName} {c.groomLastName} (
                                    {c.groomNationalId})
                                  </p>
                                  <p>
                                    <strong>نام همسر:</strong>{" "}
                                    {c.spouseFirstName} {c.spouseLastName} (
                                    {c.spouseNationalId})
                                  </p>
                                  <p>
                                    <strong>آدرس:</strong> {c.address}
                                  </p>
                                  <p>
                                    <strong>شماره تماس:</strong> {c.phone}
                                  </p>
                                  <p>
                                    <strong>ایمیل:</strong> {c.email}
                                  </p>
                                  <p>
                                    <strong>تعداد مهمان:</strong>{" "}
                                    {c.inviteesCount}
                                  </p>
                                  <p>
                                    <strong>تاریخ برگزاری:</strong>{" "}
                                    {c.eventDate}
                                  </p>
                                  <p>
                                    <strong>ساعت:</strong> {c.startTime} تا{" "}
                                    {c.endTime}
                                  </p>
                                  <p>
                                    <strong>تعداد خدمه:</strong>{" "}
                                    {c.serviceStaffCount}
                                  </p>
                                  <p>
                                    <strong>تخفیف:</strong>{" "}
                                    {Number(c.discount || 0).toLocaleString(
                                      "fa-IR"
                                    )}{" "}
                                    تومان
                                  </p>
                                  <p>
                                    <strong>توضیحات:</strong> {c.extraDetails}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold border-b pb-1 text-blue-600">
                                    هزینه‌های مشتری
                                  </h4>
                                  <p>
                                    <strong>مبلغ ورودی:</strong>{" "}
                                    {Number(
                                      c.customerEntryFee || 0
                                    ).toLocaleString("fa-IR")}{" "}
                                    تومان
                                  </p>
                                  <p>
                                    <strong>حق سرویس:</strong>{" "}
                                    {Number(
                                      c.customerServiceFee || 0
                                    ).toLocaleString("fa-IR")}{" "}
                                    تومان
                                  </p>
                                  {c.includeJuice && (
                                    <p>
                                      <strong>
                                        قیمت آبمیوه ({c.juiceCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.customerJuicePrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeTea && (
                                    <p>
                                      <strong>
                                        قیمت چایی ({c.teaCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.customerTeaPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeWater && (
                                    <p>
                                      <strong>
                                        قیمت آب معدنی ({c.waterCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.customerWaterPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeCandle && (
                                    <p>
                                      <strong>هزینه شمع‌آرایی:</strong>{" "}
                                      {Number(
                                        c.customerCandlePrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeFlower && (
                                    <p>
                                      <strong>هزینه گل‌آرایی:</strong>{" "}
                                      {Number(
                                        c.customerFlowerPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeFirework && (
                                    <p>
                                      <strong>
                                        قیمت آتش‌بازی ({c.fireworkCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.customerFireworkPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeDinner && (
                                    <p>
                                      <strong>
                                        قیمت شام ({c.dinnerCount} پرس -{" "}
                                        {c.dinnerType}):
                                      </strong>{" "}
                                      {Number(
                                        c.customerDinnerPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  <p>
                                    <strong>مالیات:</strong>{" "}
                                    {Number(c.customerTax || 0).toLocaleString(
                                      "fa-IR"
                                    )}{" "}
                                    تومان
                                  </p>
                                  <p className="font-bold">
                                    <strong>مبلغ نهایی:</strong>{" "}
                                    {Number(
                                      c.customerTotalCost || 0
                                    ).toLocaleString("fa-IR")}{" "}
                                    تومان
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold border-b pb-1 text-green-600">
                                    هزینه‌های خودم
                                  </h4>
                                  <p>
                                    <strong>مبلغ ورودی:</strong>{" "}
                                    {Number(c.myEntryFee || 0).toLocaleString(
                                      "fa-IR"
                                    )}{" "}
                                    تومان
                                  </p>
                                  <p>
                                    <strong>حق سرویس:</strong>{" "}
                                    {Number(c.myServiceFee || 0).toLocaleString(
                                      "fa-IR"
                                    )}{" "}
                                    تومان
                                  </p>
                                  {c.includeJuice && (
                                    <p>
                                      <strong>
                                        قیمت آبمیوه ({c.juiceCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.myJuicePrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeTea && (
                                    <p>
                                      <strong>
                                        قیمت چایی ({c.teaCount} عدد):
                                      </strong>{" "}
                                      {Number(c.myTeaPrice || 0).toLocaleString(
                                        "fa-IR"
                                      )}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeWater && (
                                    <p>
                                      <strong>
                                        قیمت آب معدنی ({c.waterCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.myWaterPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeCandle && (
                                    <p>
                                      <strong>هزینه شمع‌آرایی:</strong>{" "}
                                      {Number(
                                        c.myCandlePrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeFlower && (
                                    <p>
                                      <strong>هزینه گل‌آرایی:</strong>{" "}
                                      {Number(
                                        c.myFlowerPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeFirework && (
                                    <p>
                                      <strong>
                                        قیمت آتش‌بازی ({c.fireworkCount} عدد):
                                      </strong>{" "}
                                      {Number(
                                        c.myFireworkPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  {c.includeDinner && (
                                    <p>
                                      <strong>
                                        قیمت شام ({c.dinnerCount} پرس -{" "}
                                        {c.dinnerType}):
                                      </strong>{" "}
                                      {Number(
                                        c.myDinnerPrice || 0
                                      ).toLocaleString("fa-IR")}{" "}
                                      تومان
                                    </p>
                                  )}
                                  <p>
                                    <strong>مالیات:</strong>{" "}
                                    {Number(c.myTax || 0).toLocaleString(
                                      "fa-IR"
                                    )}{" "}
                                    تومان
                                  </p>
                                  <p className="font-bold">
                                    <strong>مبلغ نهایی:</strong>{" "}
                                    {Number(c.myTotalCost || 0).toLocaleString(
                                      "fa-IR"
                                    )}{" "}
                                    تومان
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-end mt-4">
                                <Button
                                  onClick={() =>
                                    document
                                      .querySelector('[data-state="open"]')
                                      .click()
                                  }
                                >
                                  بستن
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan="4"
                        className="h-24 text-center text-gray-500"
                      >
                        قراردادی یافت نشد.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      setCurrentPageNumber((p) => Math.max(p - 1, 1))
                    }
                    disabled={currentPageNumber === 1}
                    variant="outline"
                    size="icon"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    صفحه {currentPageNumber} از {totalPages}
                  </div>
                  <Button
                    onClick={() =>
                      setCurrentPageNumber((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPageNumber === totalPages}
                    variant="outline"
                    size="icon"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Simple Reporting (added to remove runtime error)
  // ------------------------------------------------------------------
  const Reporting = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const load = async () => {
        try {
          const res = await fetchWithAuth(
            `${API_BASE_URL}/api/contracts/reporting`
          );
          if (res.ok) {
            const data = await res.json();
            setRows(data || []);
          }
        } catch (e) {
          /* noop */
        }
        setLoading(false);
      };
      load();
    }, []);

    return (
      <div className="container mx-auto p-8 min-h-screen font-iransans">
        <BackButton />
        <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-800">
          گزارش‌گیری
        </h1>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                داده‌ای یافت نشد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">ماه</TableHead>
                      <TableHead className="text-right">
                        تعداد قرارداد
                      </TableHead>
                      <TableHead className="text-right">
                        جمع مبلغ مشتری
                      </TableHead>
                      <TableHead className="text-right">
                        جمع مبلغ خودم
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{r.monthName}</TableCell>
                        <TableCell>{r.contractCount}</TableCell>
                        <TableCell>
                          {Number(
                            r.customerTotal || r.customerTotalCost || 0
                          ).toLocaleString("fa-IR")}{" "}
                          تومان
                        </TableCell>
                        <TableCell>
                          {Number(
                            r.myTotal || r.myTotalCost || 0
                          ).toLocaleString("fa-IR")}{" "}
                          تومان
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Router
  // ------------------------------------------------------------------
  const renderPage = () => {
    if (loadingInitialData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    if (!isLoggedIn) return <Login />;
    switch (currentPage) {
      case "mySettings":
        return (
          <SettingsPage title="تنظیمات قیمت برای خودم" settingsType="my" />
        );
      case "customerSettings":
        return (
          <SettingsPage
            title="تنظیمات قیمت برای مشتری"
            settingsType="customer"
          />
        );
      case "createContract":
        return <CreateContract />;
      case "contractsList":
        return <ContractsList />;
      case "reporting":
        return <Reporting />; // fixed missing component
      case "userManagement":
        return (
          <UserManagement
            showError={showError}
            navigate={navigate}
            BackButton={BackButton}
          />
        );
      default:
        return <ContractsList />;
    }
  };

  // ------------------------------------------------------------------
  // Root
  // ------------------------------------------------------------------
  return (
    <div dir="rtl">
      {renderPage()}
      {errorMessage && (
        <Modal title="خطا" onClose={() => setErrorMessage("")}>
          <p>{errorMessage}</p>
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// User Management (moved outside to prevent remount on parent renders)
// ------------------------------------------------------------------
function UserManagement({ showError, navigate, BackButton }) {
  const { users, setUsers } = useStore();
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "user",
    allowedPages: [],
  });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(null);
  const [openAccessDialog, setOpenAccessDialog] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedRole, setSelectedRole] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        showError("خطا در دریافت کاربران.");
      }
    } catch (e) {
      showError("خطای سرور.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users`, {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        alert("کاربر جدید با موفقیت ایجاد شد.");
        fetchUsers();
        setNewUser({
          username: "",
          password: "",
          role: "user",
          allowedPages: [],
        });
      } else {
        const t = await res.json().catch(() => ({}));
        showError(t.message || "خطا در ایجاد کاربر.");
      }
    } catch (e) {
      showError("خطای سرور.");
    }
  };

  const handleUpdatePassword = async (id, newPassword) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        alert("رمز عبور با موفقیت تغییر کرد.");
        fetchUsers();
        return true;
      } else {
        showError("خطا در تغییر رمز عبور.");
        return false;
      }
    } catch (e) {
      showError("خطای سرور.");
      return false;
    }
  };

  const handleUpdatePermissions = async (id, pages, isAdmin) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          allowedPages: isAdmin ? PAGE_OPTIONS.map((p) => p.key) : pages,
          role: isAdmin ? "admin" : "user",
        }),
      });
      if (res.ok) {
        alert("دسترسی‌ها به‌روزرسانی شد.");
        fetchUsers();
        return true;
      } else {
        showError("خطا در به‌روزرسانی دسترسی‌ها.");
        return false;
      }
    } catch (e) {
      showError("خطای سرور.");
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="container mx-auto p-8 min-h-screen font-iransans">
      <BackButton />
      <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-800">
        مدیریت کاربران
      </h1>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>ایجاد کاربر جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="newUsername">نام کاربری</Label>
                <Input
                  id="newUsername"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">رمز عبور</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-isAdmin"
                checked={newUser.role === "admin"}
                onCheckedChange={(checked) => {
                  if (checked) {
                    if (users.some((u) => u.role === "admin")) {
                      alert("فقط یک کاربر مدیر مجاز است");
                      return;
                    }
                    setNewUser({
                      ...newUser,
                      role: "admin",
                      allowedPages: PAGE_OPTIONS.map((p) => p.key),
                    });
                  } else {
                    setNewUser({ ...newUser, role: "user", allowedPages: [] });
                  }
                }}
              />
              <Label htmlFor="new-isAdmin">کاربر مدیر</Label>
            </div>
            <div className="flex flex-wrap gap-4">
              {PAGE_OPTIONS.map((p) => (
                <div key={p.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`new-${p.key}`}
                    checked={newUser.allowedPages.includes(p.key)}
                    disabled={newUser.role === "admin"}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...newUser.allowedPages, p.key]
                        : newUser.allowedPages.filter((ap) => ap !== p.key);
                      setNewUser({ ...newUser, allowedPages: updated });
                    }}
                  />
                  <Label htmlFor={`new-${p.key}`}>{p.label}</Label>
                </div>
              ))}
            </div>
            <Button type="submit">ثبت کاربر جدید</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>لیست کاربران</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام کاربری</TableHead>
                <TableHead className="text-right">سطح دسترسی</TableHead>
                <TableHead className="text-right">صفحات مجاز</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role || "user"}</TableCell>
                  <TableCell>
                    {(user.allowedPages || [])
                      .map(
                        (p) =>
                          PAGE_OPTIONS.find((opt) => opt.key === p)?.label || p
                      )
                      .join("، ")}
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={openPasswordDialog === user._id}
                      onOpenChange={(open) =>
                        setOpenPasswordDialog(open ? user._id : null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Key className="h-4 w-4 ml-2" /> تغییر رمز عبور
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            تغییر رمز عبور برای {user.username}
                          </DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const np = e.target.elements.newPassword.value;
                            const ok = await handleUpdatePassword(user._id, np);
                            if (ok) setOpenPasswordDialog(null);
                          }}
                        >
                          <div className="grid gap-2">
                            <Label htmlFor="newPassword">رمز عبور جدید</Label>
                            <Input
                              id="newPassword"
                              name="newPassword"
                              type="password"
                              required
                            />
                          </div>
                          <Button type="submit" className="mt-4 w-full">
                            ذخیره
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={openAccessDialog === user._id}
                      onOpenChange={(open) => {
                        if (open) {
                          setSelectedPages(user.allowedPages || []);
                          setSelectedRole(user.role === "admin");
                        }
                        setOpenAccessDialog(open ? user._id : null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mr-2">
                          <Shield className="h-4 w-4 ml-2" /> تنظیم دسترسی
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            تنظیم دسترسی برای {user.username}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center space-x-2 py-2">
                          <Checkbox
                            id={`admin-${user._id}`}
                            checked={selectedRole}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                if (
                                  users.some(
                                    (u) =>
                                      u.role === "admin" && u._id !== user._id
                                  )
                                ) {
                                  alert("فقط یک کاربر مدیر مجاز است");
                                  return;
                                }
                                setSelectedRole(true);
                                setSelectedPages(
                                  PAGE_OPTIONS.map((p) => p.key)
                                );
                              } else {
                                setSelectedRole(false);
                              }
                            }}
                          />
                          <Label htmlFor={`admin-${user._id}`}>
                            کاربر مدیر
                          </Label>
                        </div>
                        <div className="flex flex-wrap gap-4 py-4">
                          {PAGE_OPTIONS.map((p) => (
                            <div
                              key={p.key}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`perm-${user._id}-${p.key}`}
                                checked={selectedPages.includes(p.key)}
                                disabled={
                                  selectedRole && p.key === "userManagement"
                                }
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...selectedPages, p.key]
                                    : selectedPages.filter(
                                        (ap) => ap !== p.key
                                      );
                                  setSelectedPages(updated);
                                }}
                              />
                              <Label htmlFor={`perm-${user._id}-${p.key}`}>
                                {p.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={async () => {
                            const ok = await handleUpdatePermissions(
                              user._id,
                              selectedPages,
                              selectedRole
                            );
                            if (ok) setOpenAccessDialog(null);
                          }}
                        >
                          ذخیره
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-end"></div>
    </div>
  );
}
