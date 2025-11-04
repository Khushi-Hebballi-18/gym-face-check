import { CheckCircle, XCircle, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Member {
  id: string;
  name: string;
  phone: string | null;
  membership_end_date: string;
  is_active: boolean;
}

interface MemberStatusProps {
  member: Member | null;
  similarity?: number;
}

const MemberStatus = ({ member, similarity }: MemberStatusProps) => {
  if (!member) {
    return (
      <Card className="border-destructive bg-card/50 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-6 w-6" />
            No Match Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Face not recognized. Please register as a new member.
          </p>
        </CardContent>
      </Card>
    );
  }

  const endDate = new Date(member.membership_end_date);
  const today = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0;

  return (
    <Card className={`border-2 shadow-[var(--shadow-card)] ${
      isExpired ? "border-destructive bg-card/50" : 
      isExpiringSoon ? "border-yellow-500 bg-card/50" : 
      "border-accent bg-card/50"
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isExpired ? (
            <XCircle className="h-6 w-6 text-destructive" />
          ) : (
            <CheckCircle className="h-6 w-6 text-accent" />
          )}
          Member Found
        </CardTitle>
        {similarity !== undefined && (
          <p className="text-sm text-muted-foreground">
            Match confidence: {(similarity * 100).toFixed(1)}%
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{member.name}</p>
            </div>
          </div>

          {member.phone && (
            <div className="flex items-center gap-3">
              <div className="h-5 w-5" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{member.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Membership Status</p>
              <div className="flex items-center gap-2 mt-1">
                {isExpired ? (
                  <>
                    <Badge variant="destructive">Expired</Badge>
                    <span className="text-sm">
                      Expired {Math.abs(daysLeft)} days ago
                    </span>
                  </>
                ) : (
                  <>
                    <Badge className="bg-accent text-accent-foreground">Active</Badge>
                    <span className="text-sm">
                      {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Expiry Date</p>
            <p className="text-lg font-medium">
              {endDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberStatus;