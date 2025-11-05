import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import FaceScanner from "./FaceScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractFaceEmbedding } from "@/lib/faceDetection";
import { memberSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { validateFaceEmbedding } from "@/lib/imageValidation";

const MemberRegistration = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipMonths, setMembershipMonths] = useState(1);
  const [membershipDays, setMembershipDays] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCapture = (imageData: string, canvas: HTMLCanvasElement) => {
    setCapturedImage(imageData);
    setCapturedCanvas(canvas);
    toast.success("Face captured successfully!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !capturedCanvas) {
      toast.error("Please provide name and capture face image");
      return;
    }

    // Validate input
    try {
      memberSchema.parse({
        name,
        phone: phone || "",
        membershipMonths,
        membershipDays
      });
    } catch (error) {
      if (error instanceof ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Extract face embedding
      const embedding = await extractFaceEmbedding(capturedCanvas);

      // Validate embedding
      const embeddingValidation = validateFaceEmbedding(embedding);
      if (!embeddingValidation.isValid) {
        toast.error(embeddingValidation.error || "Invalid face data");
        setIsSubmitting(false);
        return;
      }

      // Calculate membership end date
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + membershipMonths);
      endDate.setDate(endDate.getDate() + membershipDays);

      // Insert member into database
      const { data: memberData, error } = await supabase
        .from("members")
        .insert({
          name,
          phone: phone || null,
          membership_end_date: endDate.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert biometric data separately
      const { error: biometricError } = await supabase
        .from("member_biometrics")
        .insert({
          member_id: memberData.id,
          face_embedding: embedding,
        });

      if (biometricError) throw biometricError;

      toast.success("Member registered successfully!");
      
      // Reset form
      setName("");
      setPhone("");
      setMembershipMonths(1);
      setMembershipDays(0);
      setCapturedImage(null);
      setCapturedCanvas(null);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error registering member:", error);
      toast.error("Failed to register member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <UserPlus className="h-6 w-6 text-primary" />
          Register New Member
        </CardTitle>
        <CardDescription>
          Capture member's face and enter their details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="bg-secondary border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="months">Membership Months</Label>
                <Input
                  id="months"
                  type="number"
                  value={membershipMonths}
                  onChange={(e) => setMembershipMonths(parseInt(e.target.value) || 0)}
                  min={0}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label htmlFor="days">Additional Days</Label>
                <Input
                  id="days"
                  type="number"
                  value={membershipDays}
                  onChange={(e) => setMembershipDays(parseInt(e.target.value) || 0)}
                  min={0}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Capture Face *</Label>
            <FaceScanner onCapture={handleCapture} />
            
            {capturedImage && (
              <div className="mt-4">
                <p className="text-sm text-accent mb-2">✓ Face captured successfully</p>
                <img 
                  src={capturedImage} 
                  alt="Captured face" 
                  className="w-32 h-32 object-cover rounded-lg border-2 border-accent"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !capturedImage}
            className="w-full bg-primary hover:bg-primary/90 shadow-[var(--shadow-glow)]"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Register Member
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MemberRegistration;