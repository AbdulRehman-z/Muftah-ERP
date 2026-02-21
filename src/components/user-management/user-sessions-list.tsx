import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, MonitorX, Laptop, Tablet, Smartphone, HelpCircle } from "lucide-react";
import { Session } from "better-auth";

type Props = {
    userId: string;
};

export const UserSessionsList = ({ userId }: Props) => {
    const { listUserSessions, revokeUserSession, revokeAllUserSessions } = useUsers();
    const { data: sessions, isLoading: isLoadingSessions } = listUserSessions(userId, true);

    const getDeviceIcon = (userAgent?: string) => {
        if (!userAgent) return <HelpCircle className="size-4 opacity-50" />;
        const ua = userAgent.toLowerCase();
        if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) return <Smartphone className="size-4 opacity-50" />;
        if (ua.includes("tablet") || ua.includes("ipad")) return <Tablet className="size-4 opacity-50" />;
        return <Laptop className="size-4 opacity-50" />;
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
                {/* <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Live Activity</span>
                </div> */}
                {sessions && sessions.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/5"
                        onClick={() => {
                            revokeAllUserSessions.mutate({ userId });
                        }}
                        disabled={revokeAllUserSessions.isPending}
                    >
                        Revoke All
                    </Button>
                )}
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {isLoadingSessions ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-3 opacity-40">
                        <Loader2 className="animate-spin size-6 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Syncing Sessions...</span>
                    </div>
                ) : sessions && sessions.length > 0 ? (
                    sessions.map((session: Session) => (
                        <div key={session.token} className="flex items-center justify-between p-3 border border-border/40 bg-muted/5 rounded-xl group transition-all hover:bg-muted/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-background border border-border/40 rounded-lg  group-hover:border-primary/20 transition-colors">
                                    {getDeviceIcon(session.userAgent!)}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-xs truncate max-w-[150px]">{session.userAgent || "Unknown Device"}</span>
                                        {session.ipAddress && (
                                            <span className="text-[9px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded border border-border/30">
                                                {session.ipAddress}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/70">
                                        Active since {format(new Date(session.createdAt), "MMM d, h:mm a")}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                                onClick={() => revokeUserSession.mutate({ sessionToken: session.token })}
                                disabled={revokeUserSession.isPending}
                            >
                                <MonitorX className="size-4" />
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed rounded-xl bg-muted/5 opacity-40">
                        <div className="p-3 bg-muted rounded-full mb-3">
                            <Laptop className="size-6" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-none">Access Cleared</p>
                        <p className="text-[10px] mt-1">No active login sessions detected for this user.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
