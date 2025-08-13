import React, { useEffect, useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const API_BASE_URL = window.location.origin;

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
};

const HallContracts = ({ BackButton }) => {
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/contracts/search`);
        if (res.ok) {
          const data = await res.json();
          setContracts(data.contracts || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-8 min-h-screen font-iransans">
      {BackButton && <BackButton />}
      <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-800">
        قرارداد های سالن عقد
      </h1>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">نام صاحب قرارداد</TableHead>
              <TableHead className="text-right">تاریخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length > 0 ? (
              contracts.map((c) => (
                <TableRow key={c._id || c.id}>
                  <TableCell>{c.contractOwner}</TableCell>
                  <TableCell>{c.eventDate}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  قراردادی یافت نشد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default HallContracts;

