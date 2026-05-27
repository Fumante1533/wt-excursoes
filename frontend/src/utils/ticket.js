export function getTicketQrValue(ticket) {
  if (!ticket) return "";
  return String(ticket.qrPayload || ticket.securePayload || ticket.code || "");
}

export function getTicketPublicUrl(ticket) {
  const payload = getTicketQrValue(ticket);
  if (payload.startsWith("http")) return payload;
  if (!ticket?.code) return "";
  return `/ticket/${encodeURIComponent(ticket.code)}`;
}

export function formatValidationDate(value) {
  if (!value) return "";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString("pt-BR");
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString("pt-BR");
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("pt-BR");
}
