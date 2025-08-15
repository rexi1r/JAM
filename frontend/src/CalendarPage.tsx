import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import "dayjs/locale/fa";

dayjs.extend(jalaliday);
dayjs.calendar("jalali");
dayjs.locale("fa");

// نوع داده رویداد
type CalendarEvent = {
  id: string;
  date: string; // فرمت جلالی YYYY-MM-DD
  text: string;
  repeatAnnually: boolean; // تکرار سالانه
  remindDaysBefore: number; // چند روز قبل یادآوری شود
};

const STORAGE_KEY = "wedding-hall-calendar-events-v1";

const jalaliMonths = [
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

const weekdaysShort = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // شنبه تا جمعه

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toPersianDigits(input: string | number) {
  const s = String(input);
  const map: Record<string, string> = {
    "0": "۰",
    "1": "۱",
    "2": "۲",
    "3": "۳",
    "4": "۴",
    "5": "۵",
    "6": "۶",
    "7": "۷",
    "8": "۸",
    "9": "۹",
  };
  return s.replace(/[0-9]/g, (d) => map[d]);
}

function readEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CalendarEvent[];
    // پاکسازی مقادیر خراب
    return parsed.filter((e) => e && e.id && e.date && e.text !== undefined);
  } catch {
    return [];
  }
}

function writeEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function groupByDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = map.get(e.date) || [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return map;
}

// محاسبه یادآوری‌های نزدیک
function computeUpcomingReminders(
  allEvents: CalendarEvent[],
  daysAhead = 30
) {
  const today = dayjs().startOf("day");
  const results: Array<{
    dueDate: dayjs.Dayjs; // تاریخی که باید یادآوری شود
    eventDate: dayjs.Dayjs; // تاریخ خودِ رویداد (امسال یا سال جاری)
    e: CalendarEvent;
  }> = [];

  for (const e of allEvents) {
    const base = dayjs(e.date, "YYYY-MM-DD"); // در حالت جلالی
    if (!base.isValid()) continue;

    // تاریخ وقوع در سال جاری (جلالی)
    let occurrence = base.year(today.year());

    // اگر تاریخ وقوع امسال گذشته باشد، به سال بعد منتقل کن
    if (occurrence.isBefore(today, "day")) {
      occurrence = occurrence.add(1, "year");
    }

    // اگر تکرار سالانه نباشد و سال اصلی با سال وقوع یکسان نباشد، فقط همان سال را در نظر بگیر
    if (!e.repeatAnnually) {
      const originalYear = base.year();
      if (today.year() !== originalYear) {
        // چک کنیم آیا یادآوریِ سالِ اصلی هنوز نرسیده؟
        occurrence = base; // فقط همان سال
        if (occurrence.isBefore(today, "day")) continue; // گذشته است
      }
    }

    const due = occurrence.subtract(e.remindDaysBefore || 0, "day");
    const diff = due.diff(today, "day");
    if (diff >= 0 && diff <= daysAhead) {
      results.push({ dueDate: due, eventDate: occurrence, e });
    }
  }

  // مرتب‌سازی بر اساس نزدیک‌ترین یادآوری
  results.sort((a, b) => a.dueDate.valueOf() - b.dueDate.valueOf());
  return results;
}

function useEventStore() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => readEvents());

  useEffect(() => {
    writeEvents(events);
  }, [events]);

  const add = (e: CalendarEvent) => setEvents((prev) => [...prev, e]);
  const update = (e: CalendarEvent) =>
    setEvents((prev) => prev.map((x) => (x.id === e.id ? e : x)));
  const remove = (id: string) =>
    setEvents((prev) => prev.filter((x) => x.id !== id));
  const clearAll = () => setEvents([]);

  return { events, add, update, remove, clearAll };
}

function DayCell({
  date,
  dayNumber,
  items,
  onAdd,
  onEdit,
  isToday,
}: {
  date: string; // YYYY-MM-DD (Jalali)
  dayNumber: number;
  items: CalendarEvent[];
  onAdd: (date: string) => void;
  onEdit: (e: CalendarEvent) => void;
  isToday?: boolean;
}) {
  return (
    <div
      className={
        "relative min-h-28 rounded-2xl border border-neutral-200 p-2 hover:shadow-sm transition-shadow bg-white/70 backdrop-blur-sm " +
        (isToday ? " ring-2 ring-indigo-500" : "")
      }
      onDoubleClick={() => onAdd(date)}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-500 select-none">{toPersianDigits(dayNumber)}</div>
        <button
          className="text-xs px-2 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200"
          onClick={() => onAdd(date)}
          title="افزودن رویداد"
        >
          +
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {items.slice(0, 3).map((e) => (
          <button
            key={e.id}
            className="w-full text-right text-xs px-2 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 truncate"
            onClick={() => onEdit(e)}
            title={e.text}
          >
            {e.text}
          </button>
        ))}
        {items.length > 3 && (
          <div className="text-[11px] text-neutral-400">
            {toPersianDigits(items.length - 3)} مورد دیگر…
          </div>
        )}
      </div>
    </div>
  );
}

function EventModal({
  open,
  onClose,
  initialDate,
  onSaveNew,
  onUpdate,
  onDelete,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  initialDate: string; // YYYY-MM-DD (Jalali)
  onSaveNew: (e: CalendarEvent) => void;
  onUpdate: (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
  existing: CalendarEvent[];
}) {
  const [text, setText] = useState("");
  const [repeatAnnually, setRepeatAnnually] = useState(true);
  const [remindDaysBefore, setRemindDaysBefore] = useState(7);

  useEffect(() => {
    if (open) {
      setText("");
      setRepeatAnnually(true);
      setRemindDaysBefore(7);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl" dir="rtl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">رویدادهای {dayjs(initialDate, "YYYY-MM-DD").format("YYYY/MM/DD")}</h3>
          <button
            className="px-3 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200"
            onClick={onClose}
          >
            بستن
          </button>
        </div>

        {existing.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-neutral-500 mb-2">رویدادهای ثبت‌شده:</div>
            <div className="space-y-2 max-h-52 overflow-auto pr-1">
              {existing.map((e) => (
                <div key={e.id} className="border rounded-xl p-2 flex items-start justify-between gap-2">
                  <div className="text-sm leading-6">
                    <div className="font-medium">{e.text}</div>
                    <div className="text-neutral-500 text-xs flex gap-3 mt-1">
                      <span>{e.repeatAnnually ? "تکرار سالانه" : "یک‌بار"}</span>
                      <span>یادآوری {toPersianDigits(e.remindDaysBefore)} روز قبل</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="text-xs px-2 py-1 rounded-xl bg-amber-100 hover:bg-amber-200"
                      onClick={() => {
                        // پرکردن فرم برای ویرایش سریع
                        setText(e.text);
                        setRepeatAnnually(e.repeatAnnually);
                        setRemindDaysBefore(e.remindDaysBefore);
                        // حذف و ذخیره مجدد پس از تغییر
                        onDelete(e.id);
                      }}
                    >
                      ویرایش سریع
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded-xl bg-rose-100 hover:bg-rose-200"
                      onClick={() => onDelete(e.id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 border-t pt-4">
          <div className="text-sm text-neutral-500 mb-2">افزودن رویداد جدید</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs mb-1">متن رویداد</label>
              <input
                className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="مثلاً سالگرد عقد حسن عسگری"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs mb-1">تکرار</label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={repeatAnnually ? "yearly" : "once"}
                onChange={(e) => setRepeatAnnually(e.target.value === "yearly")}
              >
                <option value="yearly">سالانه</option>
                <option value="once">یک‌بار</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">یادآوری</label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={remindDaysBefore}
                onChange={(e) => setRemindDaysBefore(Number(e.target.value))}
              >
                {[0, 1, 3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {toPersianDigits(d)} روز قبل
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700"
                onClick={() => {
                  if (!text.trim()) return;
                  const newEvent: CalendarEvent = {
                    id: uid(),
                    date: initialDate,
                    text: text.trim(),
                    repeatAnnually,
                    remindDaysBefore,
                  };
                  onSaveNew(newEvent);
                  setText("");
                }}
              >
                ذخیره
              </button>
              <button
                className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 hover:bg-neutral-200"
                onClick={onClose}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarApp() {
  const { events, add, remove, clearAll } = useEventStore();
  const [current, setCurrent] = useState(() => dayjs().startOf("month")); // ماه فعلی (جلالی)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [query, setQuery] = useState("");
  const [daysAhead, setDaysAhead] = useState(30);

  const eventsByDate = useMemo(() => groupByDate(events), [events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim();
    if (!q) return events;
    return events.filter((e) => e.text.includes(q));
  }, [events, query]);

  const reminders = useMemo(
    () => computeUpcomingReminders(filteredEvents, daysAhead),
    [filteredEvents, daysAhead]
  );

  const firstDay = current.startOf("month");
  const daysInMonth = current.daysInMonth();
  // تبدیل یکشنبه=0 به شنبه=0
  const leadingEmpty = (firstDay.day() + 1) % 7;

  const gridDays: Array<{ date: string; number: number; isToday: boolean } | null> = [];
  for (let i = 0; i < leadingEmpty; i++) gridDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = current.date(d).format("YYYY-MM-DD");
    const isToday = current.date(d).isSame(dayjs(), "day");
    gridDays.push({ date, number: d, isToday });
  }

  const goPrevMonth = () => setCurrent((c) => c.subtract(1, "month"));
  const goNextMonth = () => setCurrent((c) => c.add(1, "month"));
  const goToday = () => setCurrent(dayjs().startOf("month"));

  function openAdd(date: string) {
    setModalDate(date);
    setModalOpen(true);
  }

  function saveNew(e: CalendarEvent) {
    add(e);
  }

  function deleteEvent(id: string) {
    remove(id);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calendar-events.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          // ساده: جایگزینی کل لیست
          writeEvents(parsed);
          window.location.reload();
        }
      } catch (e) {
        alert("فایل معتبر نیست");
      }
    };
    reader.readAsText(file);
  }

  // رویدادهای تاریخ انتخاب‌شده
  const selectedEvents = useMemo(() => eventsByDate.get(modalDate) || [], [eventsByDate, modalDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* هدر */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">تقویم رویدادهای سالن عقد</h1>
            <p className="text-sm text-neutral-600 mt-1">
              روزهای مهم را ثبت کنید (مثل «سالگرد عقد حسن عسگری») و از یادآوری‌ها استفاده کنید.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200" onClick={goPrevMonth}>
              ◀︎ ماه قبل
            </button>
            <button className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200" onClick={goToday}>
              امروز
            </button>
            <button className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200" onClick={goNextMonth}>
              ماه بعد ▶︎
            </button>
          </div>
        </header>

        {/* نوار ابزار بالا */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end mb-6">
          <div className="lg:col-span-2 grid grid-cols-2 gap-2">
            {/* انتخاب ماه */}
            <div>
              <label className="block text-xs mb-1">ماه</label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={current.month()}
                onChange={(e) => setCurrent((c) => c.month(Number(e.target.value)).startOf("month"))}
              >
                {jalaliMonths.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {/* انتخاب سال */}
            <div>
              <label className="block text-xs mb-1">سال</label>
              <input
                type="number"
                className="w-full rounded-xl border px-3 py-2"
                value={current.year()}
                onChange={(e) =>
                  setCurrent((c) => c.year(Number(e.target.value) || c.year()).startOf("month"))
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">جستجوی رویداد</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              placeholder="مثلاً: حسن"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs mb-1">نمایش یادآوری تا چند روز آینده؟</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
            >
              {[7, 14, 30, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {toPersianDigits(d)} روز
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* بخش اصلی: تقویم + سایدبار */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* تقویم */}
          <div className="xl:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-semibold">
                {jalaliMonths[current.month()]} {toPersianDigits(current.year())}
              </div>
              <div className="text-sm text-neutral-500">
                امروز: {dayjs().format("dddd D MMMM YYYY")}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 select-none">
              {weekdaysShort.map((w, i) => (
                <div key={i} className="text-center text-xs text-neutral-500">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {gridDays.map((cell, idx) => {
                if (!cell) return <div key={idx} />;
                const items = eventsByDate.get(cell.date) || [];
                return (
                  <DayCell
                    key={idx}
                    date={cell.date}
                    dayNumber={cell.number}
                    items={items}
                    onAdd={openAdd}
                    onEdit={() => setModalOpen(true)}
                    isToday={cell.isToday}
                  />
                );
              })}
            </div>
          </div>

          {/* سایدبار: یادآوری‌ها و مدیریت داده */}
          <aside className="xl:col-span-1 space-y-4">
            <div className="rounded-2xl bg-white p-4 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">یادآوری‌های نزدیک</h3>
                <span className="text-xs text-neutral-500">تا {toPersianDigits(daysAhead)} روز آینده</span>
              </div>
              {reminders.length === 0 ? (
                <div className="text-sm text-neutral-500">فعلاً یادآوری نزدیکی ندارید.</div>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                  {reminders.map(({ dueDate, eventDate, e }) => (
                    <li key={`${e.id}-${dueDate.valueOf()}`} className="border rounded-xl p-2">
                      <div className="text-sm font-medium truncate">{e.text}</div>
                      <div className="text-xs text-neutral-500 mt-1 flex gap-3">
                        <span>تاریخ رویداد: {eventDate.format("YYYY/MM/DD")}</span>
                        <span>یادآوری: {dueDate.format("YYYY/MM/DD")}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 border">
              <h3 className="font-semibold mb-3">پشتیبان‌گیری و بازیابی</h3>
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700" onClick={exportJson}>
                  خروجی JSON
                </button>
                <label className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 hover:bg-neutral-200 text-center cursor-pointer">
                  ورود JSON
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importJson(f);
                  }} />
                </label>
              </div>
              <button
                className="w-full mt-2 rounded-xl bg-rose-50 text-rose-600 px-3 py-2 hover:bg-rose-100"
                onClick={() => {
                  if (confirm("همه رویدادها حذف شوند؟")) clearAll();
                }}
              >
                حذف همه رویدادها
              </button>
              <p className="text-xs text-neutral-500 mt-2 leading-6">
                همه اطلاعات فقط در مرورگر شما (LocalStorage) ذخیره می‌شود. برای انتقال به دستگاه دیگر از خروجی JSON استفاده کنید.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 border">
              <h3 className="font-semibold mb-2">راهنما</h3>
              <ul className="text-sm text-neutral-600 list-disc pr-4 space-y-1">
                <li>برای افزودن رویداد روی دکمه + هر روز بزنید یا دوبار روی سلول کلیک کنید.</li>
                <li>رویدادها را می‌توانید «تکرار سالانه» کنید و زمان یادآوری (مثلاً ۷ روز قبل) تعیین کنید.</li>
                <li>در نوار بالا می‌توانید ماه/سال را عوض کنید و بین رویدادها جستجو کنید.</li>
                <li>سایدبار سمت راست، یادآوری‌های نزدیک را نشان می‌دهد.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDate={modalDate}
        onSaveNew={saveNew}
        onUpdate={() => {}}
        onDelete={deleteEvent}
        existing={selectedEvents}
      />
    </div>
  );
}
