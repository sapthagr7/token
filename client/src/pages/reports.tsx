import { Download, Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  const downloadReport = (endpoint: string) => {
    const token = localStorage.getItem("auth_token");
    
    fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to download report");
        const disposition = res.headers.get("Content-Disposition");
        const filenameMatch = disposition?.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : "report.csv";
        return res.blob().then((blob) => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Download failed:", err);
      });
  };

  const reports = [
    {
      id: "portfolio",
      title: "Portfolio Report",
      description: "Download a summary of your current token holdings and their values",
      icon: Wallet,
      endpoint: "/api/reports/portfolio",
    },
    {
      id: "tax",
      title: "Tax Summary",
      description: "Generate a report of all your trades for tax filing purposes",
      icon: Receipt,
      endpoint: "/api/reports/tax",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Download reports and summaries for your records
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <report.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => downloadReport(report.endpoint)}
                className="w-full gap-2"
                data-testid={`button-download-${report.id}`}
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
