import React from "react";
import { useStore } from "./store";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Settings,
  User,
  BarChart,
  Users,
  Plus,
  FileText,
} from "lucide-react";

const Dashboard = ({ fetchAllData, handleLogout, navigate }) => {
  const allowedPages = useStore((state) => state.allowedPages);

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
        {allowedPages.includes("reporting") && (
          <Button onClick={() => navigate("reporting")} variant="secondary">
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
          <Button
            onClick={() => {
              navigate("createContract");
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> ثبت قرارداد سالن عقد
          </Button>
        )}
        {allowedPages.includes("studioContract") && (
          <Button onClick={() => navigate("studioContract")} variant="secondary">
            <FileText className="h-4 w-4 mr-2" /> قرارداد استدیو جم
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
      </div>
    </div>
  );
};

export default Dashboard;
