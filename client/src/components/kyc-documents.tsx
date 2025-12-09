import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Upload, Check, X, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface KycDocument {
  id: string;
  userId: string;
  documentType: string;
  fileName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
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

export function KycDocumentUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents, isLoading } = useQuery<KycDocument[]>({
    queryKey: ["/api/kyc/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ documentType, file }: { documentType: string; file: File }) => {
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return await apiRequest("POST", "/api/kyc/documents", {
        documentType,
        fileName: file.name,
        fileData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/documents"] });
      setDocumentType("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast({
        title: "Document uploaded",
        description: "Your document has been submitted for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!documentType || !selectedFile) return;
    uploadMutation.mutate({ documentType, file: selectedFile });
  };

  const hasIdDocument = documents?.some(d => d.documentType === "id");
  const hasProofOfAddress = documents?.some(d => d.documentType === "proof_of_address");
  const allApproved = documents?.length === 2 && documents.every(d => d.status === "APPROVED");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          KYC Verification Documents
        </CardTitle>
        <CardDescription>
          Upload required documents to verify your identity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {allApproved && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              All documents have been verified. Your account is fully verified.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {documents && documents.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Uploaded Documents</h4>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {documentTypeLabels[doc.documentType] || doc.documentType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileName} - {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.status} />
                        {doc.reviewNotes && (
                          <span className="text-xs text-muted-foreground">
                            {doc.reviewNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!hasIdDocument || !hasProofOfAddress) && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Upload New Document</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-document-type">
                      <SelectValue placeholder="Document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {!hasIdDocument && (
                        <SelectItem value="id">Government ID</SelectItem>
                      )}
                      {!hasProofOfAddress && (
                        <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!documentType}
                    className="gap-2"
                    data-testid="button-select-file"
                  >
                    <Upload className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : "Select File"}
                  </Button>

                  <Button
                    onClick={handleUpload}
                    disabled={!documentType || !selectedFile || uploadMutation.isPending}
                    data-testid="button-upload-document"
                  >
                    {uploadMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Upload
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: Images (JPG, PNG) or PDF. Max size: 5MB
                </p>
              </div>
            )}

            {!documents?.length && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please upload a Government ID and Proof of Address to complete KYC verification.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
