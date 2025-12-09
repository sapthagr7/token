import { AdminDocumentReview } from "@/components/admin-document-review";

export default function AdminDocumentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">KYC Documents</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage user identity verification documents
        </p>
      </div>

      <AdminDocumentReview />
    </div>
  );
}
