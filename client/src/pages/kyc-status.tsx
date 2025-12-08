import { CheckCircle, Clock, XCircle, Shield, FileText, User, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const kycSteps = [
  { id: 1, label: "Account Created", description: "Your account has been registered" },
  { id: 2, label: "KYC Submitted", description: "Your documents are being reviewed" },
  { id: 3, label: "Verification Complete", description: "You can now trade on the platform" },
];

export default function KycStatusPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const status = user.kycStatus;
  const currentStep = status === "PENDING" ? 2 : status === "APPROVED" ? 3 : 1;
  const progress = status === "PENDING" ? 66 : status === "APPROVED" ? 100 : 33;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">KYC Verification</h1>
        <p className="text-muted-foreground mt-1">
          Your identity verification status and details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {status === "APPROVED" && (
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
              {status === "PENDING" && (
                <div className="rounded-full bg-amber-100 dark:bg-amber-950/50 p-2">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              {status === "REJECTED" && (
                <div className="rounded-full bg-red-100 dark:bg-red-950/50 p-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              <span>
                {status === "APPROVED" && "Verification Complete"}
                {status === "PENDING" && "Verification In Progress"}
                {status === "REJECTED" && "Verification Rejected"}
              </span>
            </CardTitle>
            <CardDescription>
              {status === "APPROVED" && "Your identity has been verified. You can now trade on the platform."}
              {status === "PENDING" && "Our team is reviewing your information. This usually takes 1-2 business days."}
              {status === "REJECTED" && "Your verification was not successful. Please contact support for more information."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-6">
              {kycSteps.map((step, index) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                const isRejected = status === "REJECTED" && step.id === 2;

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                          isCompleted && "bg-primary border-primary",
                          isCurrent && !isRejected && "border-primary",
                          isRejected && "bg-red-500 border-red-500",
                          !isCompleted && !isCurrent && "border-muted-foreground/30"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-primary-foreground" />
                        ) : isRejected ? (
                          <XCircle className="h-5 w-5 text-white" />
                        ) : (
                          <span
                            className={cn(
                              "font-semibold",
                              isCurrent ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {step.id}
                          </span>
                        )}
                      </div>
                      {index < kycSteps.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-12 mt-2",
                            isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        />
                      )}
                    </div>
                    <div className="pt-2">
                      <p
                        className={cn(
                          "font-medium",
                          !isCompleted && !isCurrent && "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === "APPROVED" && (
                <>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <p className="text-sm">Browse available assets in the marketplace</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <p className="text-sm">Purchase tokens from other investors</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <p className="text-sm">Create sell orders for your tokens</p>
                  </div>
                </>
              )}
              {status === "PENDING" && (
                <>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                    <p className="text-sm">Wait for our team to review your information</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <p className="text-sm">Browse assets while you wait (trading disabled)</p>
                  </div>
                </>
              )}
              {status === "REJECTED" && (
                <>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-red-500 mt-0.5" />
                    <p className="text-sm">Contact support to understand the rejection reason</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <p className="text-sm">Provide additional documentation if requested</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
