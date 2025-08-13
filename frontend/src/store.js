import { create } from "zustand";

export const API_BASE_URL = window.location.origin;

export const toEnglishDigits = (str = "") =>
  str.replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);

export const to24Hour = (time) => {
  if (!time) return "";
  time = toEnglishDigits(time);
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

export const normalizeContractTimes = (contracts = []) =>
  contracts.map((c) => ({
    ...c,
    startTime: to24Hour(c.startTime),
    endTime: to24Hour(c.endTime),
  }));

export const useStore = create((set) => ({
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
  updateContract: (contract) =>
    set((s) => ({
      contracts: s.contracts.map((c) => (c._id === contract._id ? contract : c)),
    })),
  removeContract: (id) =>
    set((s) => ({ contracts: s.contracts.filter((c) => c._id !== id) })),
  editingContract: null,
  setEditingContract: (contract) => set({ editingContract: contract }),

  setMySettings: (settings) => set({ mySettings: settings }),
  setCustomerSettings: (settings) => set({ customerSettings: settings }),

  updateMySettings: (settings) => set({ mySettings: settings }),
  updateCustomerSettings: (settings) => set({ customerSettings: settings }),

  setUsers: (users) =>
    set((state) => ({
      users: typeof users === "function" ? users(state.users) : users,
    })),
  setAllowedPages: (allowedPages) => {
    localStorage.setItem("allowedPages", JSON.stringify(allowedPages));
    set({ allowedPages });
  },
}));

export const fetchWithAuth = async (url, options = {}) => {
  const state = useStore.getState();
  const token = state.token || localStorage.getItem("token");
  const refreshToken = state.refreshToken || localStorage.getItem("refreshToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const doFetch = async () => fetch(url, { ...options, headers });
  let response = await doFetch();

  if (response.status === 401 && refreshToken) {
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

