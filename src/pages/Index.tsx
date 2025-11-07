import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scan, UserPlus, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import FaceScanner from "@/components/FaceScanner";
import MemberRegistration from "@/components/MemberRegistration";
import MemberStatus from "@/components/MemberStatus";
import { BulkUpload } from "@/components/BulkUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  initializeFaceDetection,
  extractFaceEmbedding,
  compareFaceEmbeddings,
} from "@/lib/faceDetection";

const Index = () => {
  const { signOut } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [recognizedMember, setRecognizedMember] = useState<any>(null);
  const [matchSimilarity, setMatchSimilarity] = useState<number | undefined>();

  useEffect(() => {
    const init = async () => {
      const success = await initializeFaceDetection();
      if (success) {
        toast.success("Face recognition system ready");
      } else {
        toast.error("Failed to initialize face recognition");
      }
      setIsInitializing(false);
    };

    init();
  }, []);

  const handleScan = async (imageData: string, canvas: HTMLCanvasElement) => {
    setIsScanning(true);
    setRecognizedMember(null);
    setMatchSimilarity(undefined);

    try {
      // Extract embedding from captured face
      const capturedEmbedding = await extractFaceEmbedding(canvas);

      // Get all members with their biometric data using a direct join
      const { data: membersData, error } = await supabase
        .from("member_biometrics")
        .select(`
          face_embedding,
          member_id,
          members (
            id,
            name,
            phone,
            email,
            membership_start_date,
            membership_end_date,
            is_active,
            created_at,
            updated_at
          )
        `);

      if (error) throw error;

      // Transform the data to have member info at top level
      const members = membersData?.map(item => {
        const memberInfo = Array.isArray(item.members) ? item.members[0] : item.members;
        if (!memberInfo) return null;
        return {
          ...memberInfo,
          face_embedding: item.face_embedding
        };
      }).filter(m => m !== null && m.id) || [];

      if (!members || members.length === 0) {
        toast.error("No members found in database");
        setIsScanning(false);
        return;
      }

      // Find best match
      let bestMatch: any = null;
      let bestSimilarity = 0;

      for (const member of members) {
        // Skip if member has no biometric data
        if (!member.face_embedding) {
          continue;
        }

        const similarity = compareFaceEmbeddings(
          capturedEmbedding,
          member.face_embedding
        );

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = member;
        }
      }

      // Threshold for recognition (0.8 = 80% similarity)
      if (bestSimilarity > 0.7) {
        setRecognizedMember(bestMatch);
        setMatchSimilarity(bestSimilarity);
        toast.success("Member recognized!");
      } else {
        toast.error("Face not recognized. Please register.");
      }
    } catch (error) {
      console.error("Error during face recognition:", error);
      toast.error("Error during face recognition");
    } finally {
      setIsScanning(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">Initializing System</h2>
            <p className="text-muted-foreground mt-2">
              Loading face recognition models...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Gym Face Recognition
            </h1>
            <p className="text-muted-foreground text-lg">
              Scan member faces to verify membership status
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="scan" className="space-y-8">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-secondary">
            <TabsTrigger value="scan" className="data-[state=active]:bg-primary">
              <Scan className="mr-2 h-4 w-4" />
              Scan Member
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-primary">
              <UserPlus className="mr-2 h-4 w-4" />
              Register
            </TabsTrigger>
            <TabsTrigger value="bulk" className="data-[state=active]:bg-primary">
              <UserPlus className="mr-2 h-4 w-4" />
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-8">
            <div className="max-w-2xl mx-auto">
              <FaceScanner onCapture={handleScan} isScanning={isScanning} />
            </div>

            {(recognizedMember || (isScanning === false && recognizedMember === null && matchSimilarity === undefined)) && (
              <div className="max-w-2xl mx-auto mt-8 animate-in fade-in duration-500">
                <MemberStatus
                  member={recognizedMember}
                  similarity={matchSimilarity}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="register">
            <div className="max-w-2xl mx-auto">
              <MemberRegistration
                onSuccess={() => {
                  toast.success("You can now scan the member's face!");
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="max-w-4xl mx-auto">
              <BulkUpload />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
