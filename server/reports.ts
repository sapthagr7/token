import type { User, Asset, Token, Transfer, Order, PriceHistory } from "@shared/schema";
import { format } from "date-fns";

export interface ReportData {
  filename: string;
  contentType: string;
  content: string;
}

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map(row => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function generateTransactionReport(
  transfers: (Transfer & { asset: Asset; fromUser?: User; toUser?: User })[]
): ReportData {
  const headers = [
    "Transaction ID",
    "Date",
    "Time",
    "Asset",
    "Asset Type",
    "From",
    "To",
    "Amount",
    "Reason"
  ];

  const rows = transfers.map(t => [
    t.id,
    format(new Date(t.timestamp), "yyyy-MM-dd"),
    format(new Date(t.timestamp), "HH:mm:ss"),
    t.asset.title,
    t.asset.type,
    t.fromUser?.email || "SYSTEM",
    t.toUser?.email || "SYSTEM",
    t.tokenAmount,
    t.reason
  ]);

  return {
    filename: `transactions_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`,
    contentType: "text/csv",
    content: generateCsv(headers, rows)
  };
}

export function generatePortfolioReport(
  user: User,
  tokens: (Token & { asset: Asset })[]
): ReportData {
  const headers = [
    "Asset ID",
    "Asset Name",
    "Asset Type",
    "Tokens Held",
    "NAV per Token",
    "Total Value"
  ];

  const rows = tokens.map(t => [
    t.assetId,
    t.asset.title,
    t.asset.type,
    t.amount,
    t.asset.navPrice,
    (t.amount * parseFloat(t.asset.navPrice)).toFixed(2)
  ]);

  // Add totals row
  const totalValue = tokens.reduce(
    (sum, t) => sum + t.amount * parseFloat(t.asset.navPrice), 
    0
  );
  rows.push(["", "", "", "TOTAL", "", totalValue.toFixed(2)]);

  return {
    filename: `portfolio_${user.email.split("@")[0]}_${format(new Date(), "yyyy-MM-dd")}.csv`,
    contentType: "text/csv",
    content: generateCsv(headers, rows)
  };
}

export function generateTaxReport(
  user: User,
  trades: (Order & { asset: Asset })[]
): ReportData {
  const headers = [
    "Trade ID",
    "Date",
    "Asset",
    "Type",
    "Tokens",
    "Price per Token",
    "Total Value",
    "Role"
  ];

  const rows = trades.map(t => [
    t.id,
    format(new Date(t.createdAt), "yyyy-MM-dd"),
    t.asset.title,
    t.asset.type,
    t.tokenAmount,
    t.pricePerToken,
    (t.tokenAmount * parseFloat(t.pricePerToken)).toFixed(2),
    t.sellerId === user.id ? "SELLER" : "BUYER"
  ]);

  return {
    filename: `tax_summary_${user.email.split("@")[0]}_${format(new Date(), "yyyy")}.csv`,
    contentType: "text/csv",
    content: generateCsv(headers, rows)
  };
}

export function generateComplianceReport(
  users: User[],
  tokens: (Token & { asset: Asset; owner: User })[],
  transfers: (Transfer & { asset: Asset; fromUser?: User; toUser?: User })[]
): ReportData {
  const lines: string[] = [];
  
  // Header section
  lines.push("=== RWA PLATFORM COMPLIANCE REPORT ===");
  lines.push(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`);
  lines.push("");
  
  // User statistics
  lines.push("=== USER STATISTICS ===");
  lines.push(`Total Users: ${users.length}`);
  lines.push(`KYC Approved: ${users.filter(u => u.kycStatus === "APPROVED").length}`);
  lines.push(`KYC Pending: ${users.filter(u => u.kycStatus === "PENDING").length}`);
  lines.push(`KYC Rejected: ${users.filter(u => u.kycStatus === "REJECTED").length}`);
  lines.push(`Frozen Accounts: ${users.filter(u => u.isFrozen).length}`);
  lines.push("");
  
  // Token distribution
  lines.push("=== TOKEN DISTRIBUTION ===");
  const tokensByAsset = new Map<string, { title: string; totalHolders: number; totalAmount: number }>();
  tokens.forEach(t => {
    const existing = tokensByAsset.get(t.assetId) || { title: t.asset.title, totalHolders: 0, totalAmount: 0 };
    existing.totalHolders++;
    existing.totalAmount += t.amount;
    tokensByAsset.set(t.assetId, existing);
  });
  
  tokensByAsset.forEach((data, assetId) => {
    lines.push(`${data.title}: ${data.totalHolders} holders, ${data.totalAmount} tokens`);
  });
  lines.push("");
  
  // Transfer activity
  lines.push("=== TRANSFER ACTIVITY (Last 30 Days) ===");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTransfers = transfers.filter(t => new Date(t.timestamp) > thirtyDaysAgo);
  
  const transfersByType = new Map<string, number>();
  recentTransfers.forEach(t => {
    transfersByType.set(t.reason, (transfersByType.get(t.reason) || 0) + 1);
  });
  
  lines.push(`Total Transfers: ${recentTransfers.length}`);
  transfersByType.forEach((count, type) => {
    lines.push(`  ${type}: ${count}`);
  });
  lines.push("");
  
  // Frozen accounts detail
  const frozenUsers = users.filter(u => u.isFrozen);
  if (frozenUsers.length > 0) {
    lines.push("=== FROZEN ACCOUNTS ===");
    frozenUsers.forEach(u => {
      lines.push(`${u.email} (${u.name})`);
    });
    lines.push("");
  }
  
  return {
    filename: `compliance_report_${format(new Date(), "yyyy-MM-dd_HHmmss")}.txt`,
    contentType: "text/plain",
    content: lines.join("\n")
  };
}

export function generatePriceHistoryReport(
  asset: Asset,
  priceHistory: PriceHistory[]
): ReportData {
  const headers = [
    "Date",
    "Time",
    "Price",
    "Volume",
    "Order ID"
  ];

  const rows = priceHistory.map(p => [
    format(new Date(p.timestamp), "yyyy-MM-dd"),
    format(new Date(p.timestamp), "HH:mm:ss"),
    p.price,
    p.volume,
    p.orderId || ""
  ]);

  return {
    filename: `price_history_${asset.title.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`,
    contentType: "text/csv",
    content: generateCsv(headers, rows)
  };
}
