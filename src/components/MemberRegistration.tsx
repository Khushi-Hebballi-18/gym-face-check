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

const MemberRegistration = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipDays, setMembershipDays] = useState(30);
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

    setIsSubmitting(true);

    try {
      // Extract face embedding
      const embedding = await extractFaceEmbedding(capturedCanvas);

      // Calculate membership end date
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + membershipDays);

      // Insert member into database
      const { error } = await supabase.from("members").insert({
        name,
        email: email || null,
        phone: phone || null,
        face_embedding: embedding,
        membership_end_date: endDate.toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("Member registered successfully!");
      
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setMembershipDays(30);
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <Label htmlFor="days">Membership Duration (days)</Label>
              <Input
                id="days"
                type="number"
                value={membershipDays}
                onChange={(e) => setMembershipDays(parseInt(e.target.value))}
                min={1}
                className="bg-secondary border-border"
              />
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