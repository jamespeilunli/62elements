import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetchFilteredData = async (url: string, setId: number, filterKey: string) => {
  const response = await fetch(url);
  const data = await response.json();

  // Filter data based on setId
  return data.filter((item) => item[filterKey] === setId);
};
