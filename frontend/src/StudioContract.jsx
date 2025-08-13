import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const StudioContract = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder submit handler
    alert("قرارداد با موفقیت ثبت شد");
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ثبت قرارداد استدیو جم</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="owner">نام صاحب قرارداد</Label>
          <Input id="owner" name="owner" />
        </div>
        <div>
          <Label htmlFor="eventDate">تاریخ مراسم</Label>
          <Input id="eventDate" name="eventDate" placeholder="مثلاً 1402/01/01" />
        </div>
        <Button type="submit">ثبت</Button>
      </form>
    </div>
  );
};

export default StudioContract;

