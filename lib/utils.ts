import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetchFilteredTable = async (url: string, setId: number, filterKey: string) => {
  const response = await fetch(url);
  const data = await response.json();

  const filteredData = [];
  for (const row of data) {
    if (row[filterKey] == setId) {
      filteredData.push(row);
    }
  }

  return { data: filteredData, status: response.status };
};
