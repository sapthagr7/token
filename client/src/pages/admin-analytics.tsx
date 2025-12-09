import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, Wheat, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetAnalyticsPanel } from "@/components/asset-analytics";
import { TableSkeleton } from "@/components/loading-states";
import type { Asset } from "@shared/schema";

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

export default function AdminAnalyticsPage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Asset Analytics</h1>
          <p className="text-muted-foreground mt-1">
            View performance metrics and trading data for assets
          </p>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Asset Analytics</h1>
        <p className="text-muted-foreground mt-1">
          View performance metrics and trading data for assets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Select Asset
          </CardTitle>
          <CardDescription>
            Choose an asset to view its analytics and performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-analytics-asset">
              <SelectValue placeholder="Select an asset to analyze" />
            </SelectTrigger>
            <SelectContent>
              {assets?.map((asset) => {
                const Icon = assetIcons[asset.type];
                return (
                  <SelectItem key={asset.id} value={asset.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {asset.title}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedAssetId && (
        <AssetAnalyticsPanel 
          assetId={selectedAssetId} 
          assetTitle={assets?.find(a => a.id === selectedAssetId)?.title}
        />
      )}

      {!selectedAssetId && assets && assets.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No assets available. Create an asset first to view analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
