import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getAbsoluteAuthUrl } from "@/lib/auth-url";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerificationIllustration } from "../illustrations/Verificationllustration";

type Props = {
  email: string;
};

export const EmailVerification = ({ email }: Props) => {
  const [timeToNextResend, setTimeToNextResend] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendVerificationTimer = (time = 30) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimeToNextResend(time);

    intervalRef.current = setInterval(() => {
      setTimeToNextResend((t) => {
        const next = t - 1;
        if (next <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    try {
      startResendVerificationTimer();
      await authClient.sendVerificationEmail({
        email,
        callbackURL: getAbsoluteAuthUrl("/email-verification"),
      });
      toast.success("Verification email sent successfully.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resend email.";
      toast.error(message);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimeToNextResend(0);
    }
  };

  useEffect(() => {
    startResendVerificationTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const canResend = timeToNextResend === 0;

  return (
    <div className="w-full max-w-[400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <Card className="relative border-0 sm:border sm:border-border/40 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:sm:shadow-[0_8px_30px_rgb(0,0,0,0.1)] sm:rounded-2xl bg-transparent sm:bg-card overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent hidden sm:block" />

        <div className="pt-10 flex justify-center">
          <VerificationIllustration className="size-24 text-emerald-600/70 dark:text-emerald-500/50" />
        </div>

        <CardHeader className="space-y-2 pt-6 pb-4 text-center">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            Verify your email
          </CardTitle>
          <CardDescription className="text-[14px] leading-relaxed mx-auto max-w-[300px]">
            We've sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Check
            your inbox to verify your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-8 pb-10 flex flex-col items-center gap-4">
          <Button
            onClick={handleResendEmail}
            disabled={!canResend}
            variant={canResend ? "default" : "secondary"}
            className="w-full h-10 font-medium text-[14px] rounded-lg  active:scale-[0.98] transition-all"
          >
            {canResend
              ? "Resend Verification Email"
              : `Resend in ${timeToNextResend}s`}
          </Button>

          <p className="text-[13px] text-muted-foreground pt-2">
            Didn't get it? Check your spam folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
