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

const StudioContract = () => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder submit handler
    alert("قرارداد با موفقیت ثبت شد");
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ثبت قرارداد استدیو جم</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">نام و نام خانوادگی</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="ceremonyType">نوع مراسم</Label>
            <Input
              id="ceremonyType"
              name="ceremonyType"
              value={formData.ceremonyType}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="invoiceDate">مورخه رسید فاکتور</Label>
            <Input
              id="invoiceDate"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={handleInputChange}
              placeholder="مثلاً 1402/01/01"
            />
          </div>
          <div>
            <Label htmlFor="lunch">ناهار</Label>
            <Input
              id="lunch"
              name="lunch"
              value={formData.lunch}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="dinner">شام</Label>
            <Input
              id="dinner"
              name="dinner"
              value={formData.dinner}
              onChange={handleInputChange}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="homeAddress">آدرس محل سکونت</Label>
            <Textarea
              id="homeAddress"
              name="homeAddress"
              value={formData.homeAddress}
              onChange={handleInputChange}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="groomName">نام داماد</Label>
            <Input
              id="groomName"
              name="groomName"
              value={formData.groomName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="groomPhone">تلفن داماد (همراه/ثابت)</Label>
            <Input
              id="groomPhone"
              name="groomPhone"
              value={formData.groomPhone}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="brideName">نام عروس</Label>
            <Input
              id="brideName"
              name="brideName"
              value={formData.brideName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="bridePhone">تلفن عروس (همراه/ثابت)</Label>
            <Input
              id="bridePhone"
              name="bridePhone"
              value={formData.bridePhone}
              onChange={handleInputChange}
            />
          </div>
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
            <Label htmlFor="notes">توضیحات</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="hennaDate">مورخه حنابندان</Label>
            <Input
              id="hennaDate"
              name="hennaDate"
              value={formData.hennaDate}
              onChange={handleInputChange}
              placeholder="مثلاً 1402/01/01"
            />
          </div>
          <div>
            <Label htmlFor="engagementDate">مورخه عقد</Label>
            <Input
              id="engagementDate"
              name="engagementDate"
              value={formData.engagementDate}
              onChange={handleInputChange}
              placeholder="مثلاً 1402/01/01"
            />
          </div>
          <div>
            <Label htmlFor="weddingDate">مورخه عروسی</Label>
            <Input
              id="weddingDate"
              name="weddingDate"
              value={formData.weddingDate}
              onChange={handleInputChange}
              placeholder="مثلاً 1402/01/01"
            />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalPrice">قیمت کل</Label>
            <Input
              id="totalPrice"
              name="totalPrice"
              value={formData.totalPrice}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="prePayment">پیش پرداخت</Label>
            <Input
              id="prePayment"
              name="prePayment"
              value={formData.prePayment}
              onChange={handleInputChange}
            />
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

