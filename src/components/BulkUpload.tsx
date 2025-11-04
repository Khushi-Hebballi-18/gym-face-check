import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { extractFaceEmbedding } from "@/lib/faceDetection";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { memberSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface MemberData {
  file: File;
  preview: string;
  name: string;
  phone: string;
  membershipMonths: number;
  membershipDays: number;
}

export const BulkUpload = () => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMembers = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: "",
      phone: "",
      membershipMonths: 1,
      membershipDays: 0,
    }));
    setMembers([...members, ...newMembers]);
  };

  const updateMember = (index: number, field: keyof MemberData, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const removeMember = (index: number) => {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const handleUploadAll = async () => {
    if (members.length === 0) {
      toast.error("Please add at least one member");
      return;
    }

    // Validate all members before processing
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      try {
        memberSchema.parse({
          name: member.name,
          phone: member.phone || "",
          membershipMonths: member.membershipMonths,
          membershipDays: member.membershipDays
        });
      } catch (error) {
        if (error instanceof ZodError) {
          toast.error(`Member ${i + 1}: ${error.errors[0].message}`);
          return;
        }
      }
    }

    setIsUploading(true);

    try {
      for (const member of members) {
        // Load image and extract face embedding
        const img = new Image();
        img.src = member.preview;
        await new Promise((resolve) => (img.onload = resolve));

        // Create canvas and draw image
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error(`Failed to process image for ${member.name}`);
          continue;
        }
        ctx.drawImage(img, 0, 0);

        const faceEmbedding = await extractFaceEmbedding(canvas);
        
        if (!faceEmbedding) {
          toast.error(`No face detected in photo for ${member.name}`);
          continue;
        }

        // Upload photo to storage
        const fileName = `${Date.now()}_${member.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, member.file);

        if (uploadError) throw uploadError;

        // Calculate membership end date
        const membershipEndDate = new Date();
        membershipEndDate.setMonth(membershipEndDate.getMonth() + member.membershipMonths);
        membershipEndDate.setDate(membershipEndDate.getDate() + member.membershipDays);

        // Insert member into database
        const { error: insertError } = await supabase.from("members").insert({
          name: member.name,
          phone: member.phone || null,
          face_embedding: faceEmbedding,
          membership_end_date: membershipEndDate.toISOString(),
        });

        if (insertError) throw insertError;

        toast.success(`${member.name} registered successfully`);
      }

      setMembers([]);
      toast.success("All members uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload members");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Members</CardTitle>
        <CardDescription>
          Upload photos of existing members with their details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="photos" className="cursor-pointer">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select photos or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG up to 10MB each
              </p>
            </div>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </Label>
        </div>

        {members.length > 0 && (
          <div className="space-y-4">
            {members.map((member, index) => (
              <Card key={index} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeMember(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <img
                        src={member.preview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`name-${index}`}>Name *</Label>
                        <Input
                          id={`name-${index}`}
                          value={member.name}
                          onChange={(e) => updateMember(index, "name", e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`phone-${index}`}>Phone</Label>
                        <Input
                          id={`phone-${index}`}
                          value={member.phone}
                          onChange={(e) => updateMember(index, "phone", e.target.value)}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`months-${index}`}>Months</Label>
                          <Input
                            id={`months-${index}`}
                            type="number"
                            min="0"
                            value={member.membershipMonths}
                            onChange={(e) =>
                              updateMember(index, "membershipMonths", parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`days-${index}`}>Days</Label>
                          <Input
                            id={`days-${index}`}
                            type="number"
                            min="0"
                            value={member.membershipDays}
                            onChange={(e) =>
                              updateMember(index, "membershipDays", parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={handleUploadAll}
              disabled={isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? "Uploading..." : `Upload ${members.length} Member${members.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
