import React, { useEffect, useState } from "react";
import { useStore, fetchWithAuth, API_BASE_URL, toEnglishDigits } from "./store";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Settings,
  User,
  BarChart,
  Users,
  Plus,
  FileText,
  Calendar,
} from "lucide-react";

const Dashboard = ({ fetchAllData, handleLogout, navigate }) => {
  const allowedPages = useStore((state) => state.allowedPages);
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        // Fetch hall and studio contracts in parallel to avoid
        // unnecessary sequential waits and ensure both lists are
        // available before merging.
        const [hallRes, studioRes] = await Promise.all([
          fetchWithAuth(
            `${API_BASE_URL}/api/contracts/search?limit=50&page=1`
          ),
          fetchWithAuth(`${API_BASE_URL}/api/studio-contracts`),
        ]);

        const hallData = hallRes.ok ? (await hallRes.json()).contracts || [] : [];
        const studioData = studioRes.ok ? await studioRes.json() : [];

        const hallMapped = hallData.map((c) => ({
          name: c.contractOwner,
          date: c.eventDate,
          tag: "سالن عقد",
        }));

        const studioMapped = studioData
          .map((c) => ({
            name: c.fullName,
            date:
              c.weddingDate || c.engagementDate || c.hennaDate || c.invoiceDate,
            tag: "استدیو جم",
          }))
          .filter((c) => c.date);

        const parseDate = (d) => {
          const parts = toEnglishDigits(d).split("/").map(Number);
          if (parts.length !== 3) return 0;
          const [y, m, day] = parts;
          return new Date(y, m - 1, day).getTime();
        };

        const combined = [...hallMapped, ...studioMapped].sort(
          (a, b) => parseDate(b.date) - parseDate(a.date)
        );
        setContracts(combined);
      } catch (e) {
        console.error("Failed to fetch contracts", e);
      }
    };
    loadContracts();
  }, []);

  return (
    <div className="container mx-auto p-8 min-h-screen font-iransans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-800">داشبورد</h1>
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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {allowedPages.includes("mySettings") && (
          <Button onClick={() => navigate("mySettings")} variant="secondary">
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
        {allowedPages.includes("hallReporting") && (
          <Button onClick={() => navigate("hallReporting")} variant="secondary">
            <BarChart className="h-4 w-4 mr-2" /> گزارش‌گیری سالن عقد
          </Button>
        )}
        {allowedPages.includes("studioReporting") && (
          <Button onClick={() => navigate("studioReporting")} variant="secondary">
            <BarChart className="h-4 w-4 mr-2" /> گزارش‌گیری استدیو جم
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
        {allowedPages.includes("hallContracts") && (
          <Button onClick={() => navigate("hallContracts")} variant="secondary">
            <FileText className="h-4 w-4 mr-2" /> لیست قرارداد های سالن عقد
          </Button>
        )}
        {allowedPages.includes("studioContracts") && (
          <Button
            onClick={() => navigate("studioContracts")}
            variant="secondary"
          >
            <FileText className="h-4 w-4 mr-2" /> لیست قرارداد های استدیو جم
          </Button>
        )}
        {allowedPages.includes("createContract") && (
          <Button
            onClick={() => {
              navigate("createContract");
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> ثبت قرارداد سالن عقد
          </Button>
        )}
        {allowedPages.includes("studioContract") && (
          <Button onClick={() => navigate("studioContract")}>
            <FileText className="h-4 w-4 mr-2" /> ثبت قرارداد استدیو جم
          </Button>
        )}
        {allowedPages.includes("activityLogs") && (
          <Button onClick={() => navigate("activityLogs")} variant="secondary">
            <FileText className="h-4 w-4 mr-2" /> گزارش فعالیت‌ها
          </Button>
        )}
        {allowedPages.includes("calendar") && (
          <Button onClick={() => navigate("calendar")} variant="secondary">
            <Calendar className="h-4 w-4 mr-2" /> تقویم
          </Button>
        )}
      </div>
      {contracts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">قراردادها</h2>
          <div className="space-y-2">
            {contracts.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between border p-2 rounded"
              >
                <span>{c.name}</span>
                <span>{c.date}</span>
                <span className="text-sm text-gray-500">{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
