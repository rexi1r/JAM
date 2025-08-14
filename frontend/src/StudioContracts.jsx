import React, { useState } from "react";
import {
  useStore,
  fetchWithAuth,
  API_BASE_URL,
} from "./store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Pencil,
  Trash,
  RefreshCcw,
} from "lucide-react";

const StudioContracts = ({
  BackButton,
  fetchAllData,
  handleLogout,
  navigate,
  showError,
}) => {
  const contracts = useStore((state) => state.studioContracts);
  const removeContract = useStore((state) => state.removeStudioContract);
  const setEditingContract = useStore(
    (state) => state.setEditingStudioContract
  );
  const role = useStore((state) => state.role);
  const isAdmin = role === "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const contractsPerPage = 5;

  const initialFilters = {
    fullName: "",
    groomName: "",
    brideName: "",
    weddingDate: "",
  };

  const [advancedFilters, setAdvancedFilters] = useState(initialFilters);
  const [tempFilters, setTempFilters] = useState(initialFilters);
  const [openAdvanced, setOpenAdvanced] = useState(false);

  const handleAdvancedChange = (e) =>
    setTempFilters({ ...tempFilters, [e.target.name]: e.target.value });

  const applyAdvancedFilters = (e) => {
    e.preventDefault();
    setAdvancedFilters(tempFilters);
    setOpenAdvanced(false);
    setCurrentPageNumber(1);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters(initialFilters);
    setTempFilters(initialFilters);
    setOpenAdvanced(false);
    setCurrentPageNumber(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("آیا از حذف قرارداد مطمئن هستید؟")) return;
    const res = await fetchWithAuth(
      `${API_BASE_URL}/api/studio-contracts/${id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      removeContract(id);
    } else {
      const t = await res.text();
      showError(t || "خطا در حذف قرارداد.");
    }
  };

  const handleEdit = async (id) => {
    const res = await fetchWithAuth(
      `${API_BASE_URL}/api/studio-contracts/${id}`
    );
    if (res.ok) {
      const data = await res.json();
      setEditingContract(data);
      navigate("studioContract");
    } else {
      const t = await res.text();
      showError(t || "خطا در دریافت اطلاعات قرارداد.");
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const termMatch = searchTerm
      ? (c.fullName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (c.weddingDate || c.engagementDate || c.hennaDate || c.invoiceDate || "")
          .includes(searchTerm)
      : true;
    const adv = advancedFilters;
    const fullNameMatch = adv.fullName
      ? (c.fullName || "")
          .toLowerCase()
          .includes(adv.fullName.toLowerCase())
      : true;
    const groomMatch = adv.groomName
      ? (c.groomName || "")
          .toLowerCase()
          .includes(adv.groomName.toLowerCase())
      : true;
    const brideMatch = adv.brideName
      ? (c.brideName || "")
          .toLowerCase()
          .includes(adv.brideName.toLowerCase())
      : true;
    const weddingDateMatch = adv.weddingDate
      ? (c.weddingDate || "").includes(adv.weddingDate)
      : true;
    return termMatch && fullNameMatch && groomMatch && brideMatch && weddingDateMatch;
  });

  const indexOfLastContract = currentPageNumber * contractsPerPage;
  const indexOfFirstContract = indexOfLastContract - contractsPerPage;
  const currentContracts = filteredContracts.slice(
    indexOfFirstContract,
    indexOfLastContract
  );
  const totalPages = Math.ceil(filteredContracts.length / contractsPerPage) || 1;

  return (
    <div className="container mx-auto p-8 min-h-screen font-iransans">
      {BackButton && <BackButton />}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-800">
          قرارداد های استدیو جم
        </h1>
        <div className="flex gap-2">
          <Button onClick={fetchAllData} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> به‌روزرسانی
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
              <Dialog open={openAdvanced} onOpenChange={setOpenAdvanced}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Search className="h-4 w-4 mr-2" /> جستجوی پیشرفته
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>جستجوی پیشرفته قرارداد</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={applyAdvancedFilters} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="adv-fullName">نام مشتری</Label>
                      <Input
                        id="adv-fullName"
                        name="fullName"
                        value={tempFilters.fullName}
                        onChange={handleAdvancedChange}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="adv-groomName">نام داماد</Label>
                        <Input
                          id="adv-groomName"
                          name="groomName"
                          value={tempFilters.groomName}
                          onChange={handleAdvancedChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="adv-brideName">نام عروس</Label>
                        <Input
                          id="adv-brideName"
                          name="brideName"
                          value={tempFilters.brideName}
                          onChange={handleAdvancedChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="adv-weddingDate">تاریخ مراسم</Label>
                        <Input
                          id="adv-weddingDate"
                          name="weddingDate"
                          value={tempFilters.weddingDate}
                          onChange={handleAdvancedChange}
                          placeholder="مثلاً 1402/01/01"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearAdvancedFilters}
                      >
                        پاکسازی
                      </Button>
                      <Button type="submit">جستجو</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نام مشتری</TableHead>
                  <TableHead className="text-right">تاریخ مراسم</TableHead>
                  <TableHead className="text-right">مبلغ نهایی</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentContracts.length > 0 ? (
                  currentContracts.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell>{c.fullName}</TableCell>
                      <TableCell>
                        {c.weddingDate || c.engagementDate || c.hennaDate || c.invoiceDate}
                      </TableCell>
                      <TableCell>
                        {Number(c.totalPrice || 0).toLocaleString("fa-IR")} تومان
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 ml-2" /> مشاهده جزئیات
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] max-w-[95%]">
                              <DialogHeader>
                                <DialogTitle>
                                  جزئیات قرارداد: {c.fullName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 mt-4 text-sm">
                                <p>
                                  <strong>نوع مراسم:</strong> {c.ceremonyType}
                                </p>
                                <p>
                                  <strong>تاریخ فاکتور:</strong> {c.invoiceDate}
                                </p>
                                <p>
                                  <strong>نام داماد:</strong> {c.groomName} ({c.groomPhone})
                                </p>
                                <p>
                                  <strong>نام عروس:</strong> {c.brideName} ({c.bridePhone})
                                </p>
                                <p>
                                  <strong>محل مراسم:</strong> {c.ceremonyLocation}
                                </p>
                                <p>
                                  <strong>تاریخ حنابندان:</strong> {c.hennaDate}
                                </p>
                                <p>
                                  <strong>تاریخ نامزدی:</strong> {c.engagementDate}
                                </p>
                                <p>
                                  <strong>تاریخ عروسی:</strong> {c.weddingDate}
                                </p>
                                <p>
                                  <strong>هزینه کل:</strong> {c.totalPrice}
                                </p>
                                <p>
                                  <strong>پیش‌پرداخت:</strong> {c.prePayment}
                                </p>
                                {c.notes && (
                                  <p>
                                    <strong>توضیحات:</strong> {c.notes}
                                  </p>
                                )}
                                {c.services?.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="font-semibold border-b pb-1 mb-2">
                                      خدمات
                                    </h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>نام</TableHead>
                                          <TableHead>تعداد</TableHead>
                                          <TableHead>قیمت</TableHead>
                                          <TableHead>توضیحات</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {c.services.map((s, i) => (
                                          <TableRow key={i}>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell>{s.quantity}</TableCell>
                                            <TableCell>{s.price}</TableCell>
                                            <TableCell>{s.details}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          {isAdmin && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(c._id)}
                              >
                                <Pencil className="h-4 w-4 ml-2" /> ویرایش
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(c._id)}
                              >
                                <Trash className="h-4 w-4 ml-2" /> حذف
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
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

export default StudioContracts;
