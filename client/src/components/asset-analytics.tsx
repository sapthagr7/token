import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, BarChart3, Coins, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Asset, NavHistory, PriceHistory } from "@shared/schema";

interface AssetAnalytics {
  asset: Asset;
  currentNav: string;
  navHistory: NavHistory[];
  priceHistory: PriceHistory[];
  totalTradeVolume: number;
  totalTrades: number;
  holdersCount: number;
  supplyDistribution: { ownerId: string; amount: number }[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted))",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
];

interface AssetAnalyticsPanelProps {
  assetId: string;
  assetTitle?: string;
}

export function AssetAnalyticsPanel({ assetId, assetTitle }: AssetAnalyticsPanelProps) {
  const { data: analytics, isLoading, error } = useQuery<AssetAnalytics>({
    queryKey: ["/api/analytics/asset", assetId],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Failed to load analytics</p>
        </CardContent>
      </Card>
    );
  }

  const navChartData = analytics.navHistory
    .slice()
    .reverse()
    .map((entry) => ({
      date: format(new Date(entry.timestamp), "MMM d"),
      nav: parseFloat(entry.navPrice),
    }));

  const priceChartData = analytics.priceHistory
    .slice()
    .reverse()
    .map((entry) => ({
      date: format(new Date(entry.timestamp), "MMM d HH:mm"),
      price: parseFloat(entry.price),
      volume: entry.volume,
    }));

  const pieData = analytics.supplyDistribution.slice(0, 8).map((holder, idx) => ({
    name: `Holder ${idx + 1}`,
    value: holder.amount,
  }));

  // Calculate performance metrics
  const initialNav = analytics.navHistory.length > 0 
    ? parseFloat(analytics.navHistory[analytics.navHistory.length - 1].navPrice)
    : parseFloat(analytics.currentNav);
  const currentNavValue = parseFloat(analytics.currentNav);
  const navChange = initialNav > 0 ? ((currentNavValue - initialNav) / initialNav) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{assetTitle || analytics.asset.title}</h2>
          <p className="text-muted-foreground text-sm">Asset Performance Analytics</p>
        </div>
        <Badge variant="outline" className="text-base font-mono">
          NAV: ${currentNavValue.toFixed(2)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NAV Change</p>
                <p className={`font-semibold font-mono ${navChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {navChange >= 0 ? "+" : ""}{navChange.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="font-semibold font-mono">{analytics.totalTrades.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trade Volume</p>
                <p className="font-semibold font-mono">{analytics.totalTradeVolume.toLocaleString()} tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Holders</p>
                <p className="font-semibold font-mono">{analytics.holdersCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {priceChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trade Price History</CardTitle>
              <CardDescription>Historical trading prices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceChartData}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      fill="url(#priceGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {navChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NAV History</CardTitle>
              <CardDescription>Net Asset Value over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={navChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "NAV"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="nav"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Token Distribution</CardTitle>
              <CardDescription>Top holders by token amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      formatter={(value: number) => [`${value} tokens`, "Holdings"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Supply</span>
                <span className="font-mono">{analytics.asset.totalSupply.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Supply</span>
                <span className="font-mono">{analytics.asset.remainingSupply.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minted</span>
                <span className="font-mono">{(analytics.asset.totalSupply - analytics.asset.remainingSupply).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Cap (NAV)</span>
                <span className="font-mono">
                  ${(analytics.asset.totalSupply * currentNavValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {priceChartData.length === 0 && navChartData.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No trading or NAV history available yet. Data will appear after trades occur.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
