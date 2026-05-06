import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export function usePrintData() {
  const { id } = useParams();
  return useQuery({
    queryKey: ["print-data", id],
    queryFn: () => api.get(`/deliveries/${id}/print-data`).then(r => r.data),
    staleTime: 0,
  });
}
