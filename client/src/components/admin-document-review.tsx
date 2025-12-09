import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Check, X, Loader2, ExternalLink, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface KycDocument {
  id: string;
  userId: string;
  documentType: string;
  fileName: string;
  fileData: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

const documentTypeLabels: Record<string, string> = {
  id: "Government ID",
  proof_of_address: "Proof of Address",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
  };

  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

export function AdminDocumentReview() {
  const { toast } = useToast();
  const [previewDocument, setPreviewDocument] = useState<KycDocument | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionDocument, setActionDocument] = useState<{ doc: KycDocument; action: "approve" | "reject" } | null>(null);

  const { data: documents, isLoading } = useQuery<KycDocument[]>({
    queryKey: ["/api/admin/kyc-documents"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "APPROVED" | "REJECTED"; notes?: string }) => {
      return await apiRequest("PATCH", `/api/admin/kyc-documents/${id}`, {
        status,
        reviewNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setActionDocument(null);
      setReviewNotes("");
      toast({
        title: "Document reviewed",
        description: "The document status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = (status: "APPROVED" | "REJECTED") => {
    if (!actionDocument) return;
    reviewMutation.mutate({
      id: actionDocument.doc.id,
      status,
      notes: reviewNotes || undefined,
    });
  };

  const pendingDocuments = documents?.filter(d => d.status === "PENDING") || [];
  const reviewedDocuments = documents?.filter(d => d.status !== "PENDING") || [];

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Document Reviews
          </CardTitle>
          <CardDescription>
            Review and approve KYC documents submitted by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDocuments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No pending documents to review
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-md"
                  data-testid={`doc-review-${doc.id}`}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {doc.user?.name || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {doc.user?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" size="sm">
                          {documentTypeLabels[doc.documentType] || doc.documentType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {doc.fileName}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewDocument(doc)}
                      className="gap-1"
                      data-testid={`button-view-${doc.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setActionDocument({ doc, action: "approve" })}
                      className="gap-1"
                      data-testid={`button-approve-doc-${doc.id}`}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setActionDocument({ doc, action: "reject" })}
                      className="gap-1"
                      data-testid={`button-reject-doc-${doc.id}`}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {reviewedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Reviewed Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewedDocuments.slice(0, 10).map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-3 bg-muted/30 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {doc.user?.name} - {documentTypeLabels[doc.documentType] || doc.documentType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.reviewNotes || "No notes"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription>
              {previewDocument?.user?.name} - {documentTypeLabels[previewDocument?.documentType || ""] || previewDocument?.documentType}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[400px] flex items-center justify-center bg-muted rounded-md overflow-hidden">
            {previewDocument?.fileData ? (
              previewDocument.fileData.startsWith("data:image") ? (
                <img
                  src={previewDocument.fileData}
                  alt="Document preview"
                  className="max-w-full max-h-[400px] object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">PDF Document</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = previewDocument.fileData;
                      link.download = previewDocument.fileName;
                      link.click();
                    }}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              )
            ) : (
              <p className="text-muted-foreground">No preview available</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewDocument(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setActionDocument({ doc: previewDocument!, action: "approve" });
                setPreviewDocument(null);
              }}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setActionDocument({ doc: previewDocument!, action: "reject" });
                setPreviewDocument(null);
              }}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionDocument} onOpenChange={() => setActionDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDocument?.action === "approve" ? "Approve Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {actionDocument?.action === "approve"
                ? "Confirm that this document is valid and authentic."
                : "Provide a reason for rejecting this document."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="font-medium text-sm">{actionDocument?.doc.user?.name}</p>
              <p className="text-sm text-muted-foreground">
                {documentTypeLabels[actionDocument?.doc.documentType || ""] || actionDocument?.doc.documentType}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Review Notes {actionDocument?.action === "reject" && "(Required)"}</Label>
              <Input
                id="notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={actionDocument?.action === "reject" ? "Reason for rejection..." : "Optional notes..."}
                data-testid="input-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDocument(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDocument?.action === "approve" ? "default" : "destructive"}
              onClick={() => handleReview(actionDocument?.action === "approve" ? "APPROVED" : "REJECTED")}
              disabled={reviewMutation.isPending || (actionDocument?.action === "reject" && !reviewNotes)}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionDocument?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
