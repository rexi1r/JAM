import React, { useEffect, useState } from "react";
import { fetchWithAuth, API_BASE_URL } from "./store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ActivityLogs({ BackButton }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/logs`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error("Failed to fetch logs", e);
      }
    };
    loadLogs();
  }, []);

  return (
    <div className="container mx-auto p-4 font-iransans">
      {BackButton && <BackButton />}
      <h1 className="text-2xl font-bold mb-4">گزارش فعالیت‌ها</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>کاربر</TableHead>
            <TableHead>عملیات</TableHead>
            <TableHead>زمان</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log._id}>
              <TableCell>{log.user}</TableCell>
              <TableCell>{`${log.method} ${log.endpoint}`}</TableCell>
              <TableCell>
                {new Date(log.createdAt).toLocaleString("fa-IR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
