import React, { useState } from "react";
import {
  useStore,
  fetchWithAuth,
  API_BASE_URL,
  normalizeContractTimes,
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

const ContractsList = ({
  BackButton,
  fetchAllData,
  handleLogout,
  navigate,
  showError,
  title = "داشبورد",
}) => {
  const contracts = useStore((state) => state.contracts);
  const role = useStore((state) => state.role);
  const removeContract = useStore((state) => state.removeContract);
  const updateContract = useStore((state) => state.updateContract);
  const setEditingContract = useStore((state) => state.setEditingContract);
  const isAdmin = role === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const contractsPerPage = 5;

  const initialFilters = {
    contractOwner: "",
    groomFirstName: "",
    groomLastName: "",
    spouseFirstName: "",
    spouseLastName: "",
    eventDate: "",
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
      `${API_BASE_URL}/api/contracts/${id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      removeContract(id);
    } else {
      const t = await res.text();
      showError(t || "خطا در حذف قرارداد.");
    }
  };

  const handleStatusChange = async (id, status) => {
    const res = await fetchWithAuth(
      `${API_BASE_URL}/api/contracts/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      updateContract(normalizeContractTimes([updated])[0]);
    } else {
      const t = await res.text();
      showError(t || "خطا در تغییر وضعیت قرارداد.");
    }
  };

  const handleEdit = async (id) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/contracts/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEditingContract(normalizeContractTimes([data])[0]);
      navigate("createContract");
    } else {
      const t = await res.text();
      showError(t || "خطا در دریافت اطلاعات قرارداد.");
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const termMatch = searchTerm
      ? (c.contractOwner || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.eventDate || "").includes(searchTerm)
      : true;
    const adv = advancedFilters;
    const ownerMatch = adv.contractOwner
      ? (c.contractOwner || "").toLowerCase().includes(adv.contractOwner.toLowerCase())
      : true;
    const groomFirstMatch = adv.groomFirstName
      ? (c.groomFirstName || "").toLowerCase().includes(adv.groomFirstName.toLowerCase())
      : true;
    const groomLastMatch = adv.groomLastName
      ? (c.groomLastName || "").toLowerCase().includes(adv.groomLastName.toLowerCase())
      : true;
    const spouseFirstMatch = adv.spouseFirstName
      ? (c.spouseFirstName || "").toLowerCase().includes(adv.spouseFirstName.toLowerCase())
      : true;
    const spouseLastMatch = adv.spouseLastName
      ? (c.spouseLastName || "").toLowerCase().includes(adv.spouseLastName.toLowerCase())
      : true;
    const eventDateMatch = adv.eventDate
      ? (c.eventDate || "").includes(adv.eventDate)
      : true;
    return (
      termMatch &&
      ownerMatch &&
      groomFirstMatch &&
      groomLastMatch &&
      spouseFirstMatch &&
      spouseLastMatch &&
      eventDateMatch
    );
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
        <h1 className="text-4xl font-extrabold text-gray-800">{title}</h1>
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
                      <Label htmlFor="adv-contractOwner">نام صاحب قرارداد</Label>
                      <Input
                        id="adv-contractOwner"
                        name="contractOwner"
                        value={tempFilters.contractOwner}
                        onChange={handleAdvancedChange}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="adv-groomFirstName">نام داماد</Label>
                        <Input
                          id="adv-groomFirstName"
                          name="groomFirstName"
                          value={tempFilters.groomFirstName}
                          onChange={handleAdvancedChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="adv-groomLastName">نام خانوادگی داماد</Label>
                        <Input
                          id="adv-groomLastName"
                          name="groomLastName"
                          value={tempFilters.groomLastName}
                          onChange={handleAdvancedChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="adv-spouseFirstName">نام عروس</Label>
                        <Input
                          id="adv-spouseFirstName"
                          name="spouseFirstName"
                          value={tempFilters.spouseFirstName}
                          onChange={handleAdvancedChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="adv-spouseLastName">نام خانوادگی عروس</Label>
                        <Input
                          id="adv-spouseLastName"
                          name="spouseLastName"
                          value={tempFilters.spouseLastName}
                          onChange={handleAdvancedChange}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="adv-eventDate">تاریخ مراسم</Label>
                      <Input
                        id="adv-eventDate"
                        name="eventDate"
                        value={tempFilters.eventDate}
                        onChange={handleAdvancedChange}
                        placeholder="مثلاً 1402/01/01"
                      />
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
                  <TableHead className="text-right">نام صاحب قرارداد</TableHead>
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
                        {Number(c.customerTotalCost || 0).toLocaleString("fa-IR")} تومان
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
                                  جزئیات قرارداد: {c.contractOwner}
                                </DialogTitle>
                              </DialogHeader>
                              <div
                                className={`grid grid-cols-1 gap-4 mt-4 text-sm ${
                                  isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                                }`}
                              >
                                <div className="space-y-2">
                                  <h4 className="font-semibold border-b pb-1">
                                    اطلاعات کلی
                                  </h4>
                                  <p>
                                    <strong>نام داماد:</strong>{" "}
                                    {c.groomFirstName} {c.groomLastName} ({c.groomNationalId})
                                  </p>
                                  <p>
                                    <strong>نام همسر:</strong>{" "}
                                    {c.spouseFirstName} {c.spouseLastName} ({c.spouseNationalId})
                                  </p>
                                  <p>
                                    <strong>تاریخ:</strong> {c.eventDate}
                                  </p>
                                  <p>
                                    <strong>ساعت شروع:</strong> {c.startTime}
                                  </p>
                                  <p>
                                    <strong>ساعت پایان:</strong> {c.endTime}
                                  </p>
                                  <p>
                                    <strong>وضعیت:</strong> {c.status}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold border-b pb-1 text-blue-600">
                                    هزینه‌های مشتری
                                  </h4>
                                  <p>
                                    <strong>مبلغ ورودی:</strong>{" "}
                                    {Number(c.customerEntryFee || 0).toLocaleString("fa-IR")} تومان
                                  </p>
                                  <p>
                                    <strong>حق سرویس:</strong>{" "}
                                    {Number(c.customerServiceFee || 0).toLocaleString("fa-IR")} تومان
                                  </p>
                                  {c.includeJuice && (
                                    <p>
                                      <strong>قیمت آبمیوه ({c.juiceCount} عدد):</strong>{" "}
                                      {Number(c.customerJuicePrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  {c.includeTea && (
                                    <p>
                                      <strong>قیمت چایی ({c.teaCount} عدد):</strong>{" "}
                                      {Number(c.customerTeaPrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  {c.includeWater && (
                                    <p>
                                      <strong>قیمت آب معدنی ({c.waterCount} عدد):</strong>{" "}
                                      {Number(c.customerWaterPrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  {c.includeCandle && (
                                    <p>
                                      <strong>هزینه شمع‌آرایی:</strong>{" "}
                                      {Number(c.customerCandlePrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  {c.includeFlower && (
                                    <p>
                                      <strong>هزینه گل‌آرایی:</strong>{" "}
                                      {Number(c.customerFlowerPrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  {c.includeFirework && (
                                    <p>
                                      <strong>قیمت آتش‌بازی ({c.fireworkCount} عدد):</strong>{" "}
                                      {Number(c.customerFireworkPrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  {c.includeDinner && (
                                    <p>
                                      <strong>قیمت شام ({c.dinnerCount} پرس - {c.dinnerType}):</strong>{" "}
                                      {Number(c.customerDinnerPrice || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  )}
                                  <p>
                                    <strong>مالیات:</strong>{" "}
                                    {Number(c.customerTax || 0).toLocaleString("fa-IR")} تومان
                                  </p>
                                  <p className="font-bold">
                                    <strong>مبلغ نهایی:</strong>{" "}
                                    {Number(c.customerTotalCost || 0).toLocaleString("fa-IR")} تومان
                                  </p>
                                </div>
                                {isAdmin && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold border-b pb-1 text-green-600">
                                      هزینه‌های خودم
                                    </h4>
                                    <p>
                                      <strong>مبلغ ورودی:</strong>{" "}
                                      {Number(c.myEntryFee || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                    <p>
                                      <strong>حق سرویس:</strong>{" "}
                                      {Number(c.myServiceFee || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                    {c.includeJuice && (
                                      <p>
                                        <strong>قیمت آبمیوه ({c.juiceCount} عدد):</strong>{" "}
                                        {Number(c.myJuicePrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    {c.includeTea && (
                                      <p>
                                        <strong>قیمت چایی ({c.teaCount} عدد):</strong>{" "}
                                        {Number(c.myTeaPrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    {c.includeWater && (
                                      <p>
                                        <strong>قیمت آب معدنی ({c.waterCount} عدد):</strong>{" "}
                                        {Number(c.myWaterPrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    {c.includeCandle && (
                                      <p>
                                        <strong>هزینه شمع‌آرایی:</strong>{" "}
                                        {Number(c.myCandlePrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    {c.includeFlower && (
                                      <p>
                                        <strong>هزینه گل‌آرایی:</strong>{" "}
                                        {Number(c.myFlowerPrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    {c.includeFirework && (
                                      <p>
                                        <strong>قیمت آتش‌بازی ({c.fireworkCount} عدد):</strong>{" "}
                                        {Number(c.myFireworkPrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    {c.includeDinner && (
                                      <p>
                                        <strong>قیمت شام ({c.dinnerCount} پرس - {c.dinnerType}):</strong>{" "}
                                        {Number(c.myDinnerPrice || 0).toLocaleString("fa-IR")} تومان
                                      </p>
                                    )}
                                    <p>
                                      <strong>مالیات:</strong>{" "}
                                      {Number(c.myTax || 0).toLocaleString("fa-IR")} تومان
                                    </p>
                                  </div>
                                )}
                              </div>
                              <DialogFooter className="flex justify-end mt-4">
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleEdit(c._id)}
                                  >
                                    <Pencil className="h-4 w-4 ml-2" /> ویرایش
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => handleDelete(c._id)}
                                  >
                                    <Trash className="h-4 w-4 ml-2" /> حذف
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(
                                        c._id,
                                        c.status === "pending" ? "done" : "pending"
                                      )
                                    }
                                  >
                                    {c.status === "pending" ? "علامت انجام" : "علامت انتظار"}
                                  </Button>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
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

export default ContractsList;

