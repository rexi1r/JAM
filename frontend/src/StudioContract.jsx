import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const serviceNames = [
  "دوربین فیلمبرداری",
  "هلی‌شات NORMAL",
  "هلی‌شات FPV",
  "کرین",
  "استابلایزر (تراولر دوربین)",
  "اسلایدشو",
  "تدوین طول فیلم",
  "صدابرداری",
  "پروجکشن",
  "کلیپ فرمالیته",
  "عکاسی",
  "ویدئو پروژکتور",
];

const inputClass =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

const API_BASE_URL = window.location.origin;

const toEnglishDigits = (str = "") =>
  str.replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
};

const StudioContract = ({ BackButton, navigate, showError }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    ceremonyType: "",
    invoiceDate: "",
    lunch: "",
    dinner: "",
    homeAddress: "",
    groomName: "",
    groomPhone: "",
    brideName: "",
    bridePhone: "",
    ceremonyLocation: "",
    clipProduction: false,
    insideProvince: false,
    outsideProvince: false,
    notes: "",
    hennaDate: "",
    engagementDate: "",
    weddingDate: "",
    services: serviceNames.map((name) => ({
      name,
      quantity: "",
      price: "",
      details: "",
    })),
    totalPrice: "",
    prePayment: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleServiceChange = (index, field, value) => {
    setFormData((prev) => {
      const services = [...prev.services];
      services[index] = { ...services[index], [field]: value };
      return { ...prev, services };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/studio-contracts`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("قرارداد با موفقیت ثبت شد");
        navigate("contractsList");
      } else {
        const t = await res.text();
        if (showError) showError(t || "خطا در ثبت قرارداد.");
        else alert(t || "خطا در ثبت قرارداد.");
      }
    } catch (e) {
      if (showError) showError("خطای سرور.");
      else alert("خطای سرور.");
    }
  };

  return (
    <div className="container mx-auto p-8 min-h-screen font-iransans">
      {BackButton && <BackButton />}
      <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-800">
        ثبت قرارداد استدیو جم
      </h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">
            اطلاعات کلی قرارداد
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">نام و نام خانوادگی</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ceremonyType">نوع مراسم</Label>
              <Input
                id="ceremonyType"
                name="ceremonyType"
                value={formData.ceremonyType}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lunch">ناهار</Label>
              <Input
                id="lunch"
                name="lunch"
                value={formData.lunch}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dinner">شام</Label>
              <Input
                id="dinner"
                name="dinner"
                value={formData.dinner}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="homeAddress">آدرس محل سکونت</Label>
              <Textarea
                id="homeAddress"
                name="homeAddress"
                value={formData.homeAddress}
                onChange={handleInputChange}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="groomName">نام داماد</Label>
              <Input
                id="groomName"
                name="groomName"
                value={formData.groomName}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="groomPhone">تلفن داماد (همراه/ثابت)</Label>
              <Input
                id="groomPhone"
                name="groomPhone"
                value={formData.groomPhone}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brideName">نام عروس</Label>
              <Input
                id="brideName"
                name="brideName"
                value={formData.brideName}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bridePhone">تلفن عروس (همراه/ثابت)</Label>
              <Input
                id="bridePhone"
                name="bridePhone"
                value={formData.bridePhone}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="ceremonyLocation">محل مراسم</Label>
              <Input
                id="ceremonyLocation"
                name="ceremonyLocation"
                value={formData.ceremonyLocation}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clipProduction"
                checked={formData.clipProduction}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("clipProduction", checked)
                }
              />
              <Label htmlFor="clipProduction">ساخت کلیپ</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insideProvince"
                checked={formData.insideProvince}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("insideProvince", checked)
                }
              />
              <Label htmlFor="insideProvince">داخل استان</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="outsideProvince"
                checked={formData.outsideProvince}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("outsideProvince", checked)
                }
              />
              <Label htmlFor="outsideProvince">خارج استان</Label>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="notes">توضیحات</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">تاریخ‌ها</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoiceDate">مورخه رسید فاکتور</Label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.invoiceDate}
                onChange={(value) =>
                  handleInputChange({
                    target: {
                      name: "invoiceDate",
                      value: toEnglishDigits(value?.format("YYYY/MM/DD") || ""),
                    },
                  })
                }
                format="YYYY/MM/DD"
                containerClassName="w-full"
                inputClass={inputClass}
                inputProps={{
                  id: "invoiceDate",
                  name: "invoiceDate",
                  placeholder: "مثال: ۱۴۰۲/۰۱/۰۱",
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hennaDate">مورخه حنابندان</Label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.hennaDate}
                onChange={(value) =>
                  handleInputChange({
                    target: {
                      name: "hennaDate",
                      value: toEnglishDigits(value?.format("YYYY/MM/DD") || ""),
                    },
                  })
                }
                format="YYYY/MM/DD"
                containerClassName="w-full"
                inputClass={inputClass}
                inputProps={{
                  id: "hennaDate",
                  name: "hennaDate",
                  placeholder: "مثال: ۱۴۰۲/۰۱/۰۱",
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="engagementDate">مورخه عقد</Label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.engagementDate}
                onChange={(value) =>
                  handleInputChange({
                    target: {
                      name: "engagementDate",
                      value: toEnglishDigits(value?.format("YYYY/MM/DD") || ""),
                    },
                  })
                }
                format="YYYY/MM/DD"
                containerClassName="w-full"
                inputClass={inputClass}
                inputProps={{
                  id: "engagementDate",
                  name: "engagementDate",
                  placeholder: "مثال: ۱۴۰۲/۰۱/۰۱",
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weddingDate">مورخه عروسی</Label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.weddingDate}
                onChange={(value) =>
                  handleInputChange({
                    target: {
                      name: "weddingDate",
                      value: toEnglishDigits(value?.format("YYYY/MM/DD") || ""),
                    },
                  })
                }
                format="YYYY/MM/DD"
                containerClassName="w-full"
                inputClass={inputClass}
                inputProps={{
                  id: "weddingDate",
                  name: "weddingDate",
                  placeholder: "مثال: ۱۴۰۲/۰۱/۰۱",
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mt-6 mb-2">شرح خدمات</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شرح خدمات</TableHead>
                <TableHead>تعداد</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>توضیحات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.services.map((service, idx) => (
                <TableRow key={service.name}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>
                    <Input
                      value={service.quantity}
                      onChange={(e) =>
                        handleServiceChange(idx, "quantity", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={service.price}
                      onChange={(e) =>
                        handleServiceChange(idx, "price", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={service.details}
                      onChange={(e) =>
                        handleServiceChange(idx, "details", e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">مبالغ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="totalPrice">قیمت کل</Label>
              <Input
                id="totalPrice"
                name="totalPrice"
                value={formData.totalPrice}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prePayment">پیش پرداخت</Label>
              <Input
                id="prePayment"
                name="prePayment"
                value={formData.prePayment}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="mt-4">
          ثبت
        </Button>
      </form>
    </div>
  );
};

export default StudioContract;
