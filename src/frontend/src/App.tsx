import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { useActor } from "@/hooks/useActor";
import { useMutation } from "@tanstack/react-query";
import {
  Brain,
  Calculator,
  ChevronDown,
  CloudUpload,
  GraduationCap,
  Hash,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { Grade } from "./backend.d.ts";

/* ── Types ─────────────────────────────────────────────────────── */
type GradeMode = "number" | "letter";
type AppTab = "manual" | "upload";

const LETTER_GRADES = ["O", "A+", "A", "B+", "B", "C"] as const;
type LetterGrade = (typeof LETTER_GRADES)[number];

const LETTER_TO_POINT: Record<LetterGrade, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
};

interface SubjectRow {
  id: string;
  mode: GradeMode;
  letterGrade: LetterGrade | "";
  numberGrade: string;
  credit: string;
  errors: { grade?: string; credit?: string };
}

interface ExtractedSubject {
  subject: string;
  grade: number;
  credits: number;
}

function makeRow(id: string): SubjectRow {
  return {
    id,
    mode: "number",
    letterGrade: "",
    numberGrade: "",
    credit: "",
    errors: {},
  };
}

/* ── Classification ─────────────────────────────────────────────── */
function classify(cgpa: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (cgpa >= 9.0)
    return {
      label: "Outstanding",
      color: "text-[oklch(0.82_0.18_195)]",
      icon: "🏆",
    };
  if (cgpa >= 7.5)
    return {
      label: "Excellent",
      color: "text-[oklch(0.80_0.20_160)]",
      icon: "⭐",
    };
  if (cgpa >= 6.0)
    return { label: "Good", color: "text-[oklch(0.80_0.18_60)]", icon: "👍" };
  if (cgpa >= 5.0)
    return {
      label: "Average",
      color: "text-[oklch(0.75_0.15_85)]",
      icon: "📚",
    };
  return {
    label: "Needs Improvement",
    color: "text-[oklch(0.63_0.22_25)]",
    icon: "💪",
  };
}

/* ── App ────────────────────────────────────────────────────────── */
let rowCounter = 0;
function newId() {
  return `row-${++rowCounter}`;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";

export default function App() {
  const { actor, isFetching: actorFetching } = useActor();
  const _formId = useId();

  const [activeTab, setActiveTab] = useState<AppTab>("manual");
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => [
    makeRow(newId()),
    makeRow(newId()),
    makeRow(newId()),
  ]);
  const [result, setResult] = useState<number | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Upload tab state
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [extractedSubjects, setExtractedSubjects] = useState<
    ExtractedSubject[] | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Mutations ─────────────────────────────────────────────────── */
  const calculateMutation = useMutation({
    mutationFn: async (grades: Grade[]) => {
      if (!actor) throw new Error("Backend not ready. Please try again.");
      return actor.calculate(grades);
    },
    onSuccess: (cgpa) => {
      setResult(cgpa);
      setCalcError(null);
    },
    onError: (err: Error) => {
      const msg = err.message || "Calculation failed. Please try again.";
      setCalcError(msg);
      toast.error(msg);
    },
  });

  /* ── Subject helpers ────────────────────────────────────────────── */
  const addSubject = useCallback(() => {
    setSubjects((prev) => [...prev, makeRow(newId())]);
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setResult(null);
    setCalcError(null);
  }, []);

  const updateSubject = useCallback(
    (id: string, patch: Partial<SubjectRow>) => {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                ...patch,
                errors: { ...s.errors, ...(patch.errors ?? {}) },
              }
            : s,
        ),
      );
      setResult(null);
      setCalcError(null);
    },
    [],
  );

  const toggleMode = useCallback((id: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              mode: s.mode === "number" ? "letter" : "number",
              errors: {},
            }
          : s,
      ),
    );
    setResult(null);
  }, []);

  /* ── Validation ─────────────────────────────────────────────────── */
  function validateAll(): boolean {
    let valid = true;
    const updated = subjects.map((s) => {
      const errors: SubjectRow["errors"] = {};

      if (s.mode === "number") {
        if (s.numberGrade === "") {
          errors.grade = "Required";
          valid = false;
        } else {
          const g = Number.parseFloat(s.numberGrade);
          if (Number.isNaN(g) || g < 0 || g > 10) {
            errors.grade = "Must be 0–10";
            valid = false;
          }
        }
      } else {
        if (!s.letterGrade) {
          errors.grade = "Select grade";
          valid = false;
        }
      }

      if (s.credit === "") {
        errors.credit = "Required";
        valid = false;
      } else {
        const c = Number.parseFloat(s.credit);
        if (Number.isNaN(c) || c < 0) {
          errors.credit = "Must be ≥ 0";
          valid = false;
        }
      }

      return { ...s, errors };
    });

    setSubjects(updated);
    return valid;
  }

  /* ── Calculate (Manual) ──────────────────────────────────────────── */
  async function handleCalculate() {
    if (!validateAll()) {
      toast.error("Please fix all errors before calculating.");
      return;
    }

    const grades: Grade[] = subjects.map((s) => {
      let gradePoint: number;
      if (s.mode === "letter") {
        gradePoint = LETTER_TO_POINT[s.letterGrade as LetterGrade];
      } else {
        gradePoint = Number.parseFloat(s.numberGrade);
      }
      return {
        grade: gradePoint,
        credits: Number.parseFloat(s.credit),
      };
    });

    const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);
    if (totalCredits === 0) {
      toast.error("At least one subject must have credits greater than 0.");
      return;
    }

    calculateMutation.mutate(grades);
  }

  /* ── Image upload helpers ────────────────────────────────────────── */
  function handleFileSelect(file: File) {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10 MB.");
      return;
    }

    // Revoke old URL
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);

    setUploadedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setExtractedSubjects(null);
    setAnalyseError(null);
    setResult(null);
  }

  function handleDropzoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  }

  function clearUpload() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setUploadedImage(null);
    setImagePreviewUrl(null);
    setExtractedSubjects(null);
    setAnalyseError(null);
    setResult(null);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix: "data:image/jpeg;base64,"
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── Analyse & Calculate ─────────────────────────────────────────── */
  async function handleAnalyse() {
    if (!uploadedImage) {
      toast.error("Please upload a result image first.");
      return;
    }

    if (!GEMINI_API_KEY) {
      setAnalyseError(
        "AI analysis not configured — please use Manual Entry mode.",
      );
      return;
    }

    if (!actor) {
      toast.error("Backend not ready. Please try again.");
      return;
    }

    setIsAnalysing(true);
    setAnalyseError(null);
    setExtractedSubjects(null);
    setResult(null);

    try {
      const base64 = await fileToBase64(uploadedImage);
      const mimeType =
        uploadedImage.type === "application/pdf"
          ? "application/pdf"
          : (uploadedImage.type as "image/jpeg" | "image/png" | "image/webp");

      const prompt = `You are an academic result parser. Analyse this student result/marksheet image carefully. Extract ALL subjects with their grade points and credit hours. Return ONLY a valid JSON array with no markdown, no code block, no explanation. Each object must have exactly these fields: {"subject": string, "grade": number (0-10 numeric grade point; convert letter grades O=10, A+=9, A=8, B+=7, B=6, C=5, F=0), "credits": number}. If credits are not visible, use 3 as default.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64 } },
                ],
              },
            ],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: { message?: string } })?.error?.message ||
            "Gemini API request failed.",
        );
      }

      const data = await response.json();
      const rawText: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Strip markdown fences if any
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      let parsed: ExtractedSubject[];
      try {
        parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("No subjects found.");
        }
      } catch {
        throw new Error(
          "Could not read the result. Please try a clearer photo.",
        );
      }

      // Validate and clamp values
      const sanitised: ExtractedSubject[] = parsed.map((item) => ({
        subject: String(item.subject ?? "Subject"),
        grade: Math.min(10, Math.max(0, Number(item.grade) || 0)),
        credits: Math.max(0, Number(item.credits) || 3),
      }));

      setExtractedSubjects(sanitised);

      // Populate manual tab rows
      const newRows: SubjectRow[] = sanitised.map((item) => ({
        id: newId(),
        mode: "number" as GradeMode,
        letterGrade: "" as const,
        numberGrade: String(item.grade),
        credit: String(item.credits),
        errors: {},
      }));
      setSubjects(newRows);

      // Calculate CGPA via backend
      const grades: Grade[] = sanitised.map((item) => ({
        grade: item.grade,
        credits: item.credits,
      }));
      const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);
      if (totalCredits === 0) {
        toast.error(
          "All detected subjects have 0 credits. Please check the image.",
        );
        return;
      }

      const cgpa = await actor.calculate(grades);
      setResult(cgpa);
      toast.success("CGPA calculated from your result image!");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not read the result. Please try a clearer photo.";
      setAnalyseError(msg);
      toast.error(msg);
    } finally {
      setIsAnalysing(false);
    }
  }

  const isLoading = calculateMutation.isPending || actorFetching;
  const classification = result !== null ? classify(result) : null;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background font-body">
      {/* ── Ambient orbs ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full opacity-20 animate-orb-drift"
          style={{
            background:
              "radial-gradient(circle, oklch(0.55 0.22 295 / 0.8) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-24 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, oklch(0.82 0.18 195 / 0.7) 0%, transparent 70%)",
            filter: "blur(60px)",
            animationDelay: "-4s",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-8"
          style={{
            background:
              "radial-gradient(circle, oklch(0.30 0.08 260 / 0.4) 0%, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="relative z-10 pt-10 pb-2 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div
              className="p-2.5 rounded-2xl"
              style={{
                background: "oklch(0.20 0.04 280 / 0.8)",
                border: "1px solid oklch(0.82 0.18 195 / 0.35)",
                boxShadow: "0 0 20px oklch(0.82 0.18 195 / 0.2)",
              }}
            >
              <GraduationCap
                className="w-7 h-7"
                style={{ color: "oklch(0.82 0.18 195)" }}
              />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              CGPA
              <span style={{ color: "oklch(0.82 0.18 195)" }}> Calculator</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Upload your result image or enter grades manually — get your CGPA
            instantly.
          </p>
        </motion.div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-8">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.15,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {/* ── Tab switcher ─────────────────────────────────────── */}
          <div
            className="flex mb-4 p-1 rounded-2xl gap-1"
            style={{
              background: "oklch(0.16 0.03 280 / 0.6)",
              border: "1px solid oklch(0.30 0.05 280 / 0.4)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              data-ocid="cgpa.tab.manual"
              type="button"
              onClick={() => setActiveTab("manual")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                activeTab === "manual"
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.78 0.18 195 / 0.25), oklch(0.60 0.22 240 / 0.2))",
                      border: "1px solid oklch(0.82 0.18 195 / 0.4)",
                      color: "oklch(0.92 0.12 195)",
                      boxShadow: "0 2px 12px oklch(0.82 0.18 195 / 0.15)",
                    }
                  : {
                      border: "1px solid transparent",
                      color: "oklch(0.55 0.04 280)",
                    }
              }
            >
              <Calculator className="w-4 h-4" />
              Manual Entry
            </button>
            <button
              data-ocid="cgpa.tab.upload"
              type="button"
              onClick={() => setActiveTab("upload")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                activeTab === "upload"
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.22 295 / 0.25), oklch(0.40 0.18 280 / 0.2))",
                      border: "1px solid oklch(0.55 0.22 295 / 0.4)",
                      color: "oklch(0.82 0.18 295)",
                      boxShadow: "0 2px 12px oklch(0.55 0.22 295 / 0.15)",
                    }
                  : {
                      border: "1px solid transparent",
                      color: "oklch(0.55 0.04 280)",
                    }
              }
            >
              <Brain className="w-4 h-4" />
              Upload Result
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.55 0.22 295 / 0.25)",
                  border: "1px solid oklch(0.55 0.22 295 / 0.4)",
                  color: "oklch(0.80 0.18 295)",
                }}
              >
                AI
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "manual" ? (
              /* ── Manual Entry Tab ──────────────────────────────── */
              <motion.div
                key="manual"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {/* Main glass card */}
                <div className="glass-card rounded-2xl p-6 md:p-8">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center mb-3 px-1">
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Subject
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center w-20">
                      Grade
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center w-20">
                      Credits
                    </div>
                    <div className="w-8" />
                  </div>

                  {/* Subject rows */}
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {subjects.map((subject, idx) => (
                        <SubjectRowItem
                          key={subject.id}
                          subject={subject}
                          index={idx}
                          isOnly={subjects.length === 1}
                          onUpdate={updateSubject}
                          onRemove={removeSubject}
                          onToggleMode={toggleMode}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button
                      data-ocid="cgpa.add_button"
                      type="button"
                      variant="outline"
                      onClick={addSubject}
                      className="flex-1 gap-2 h-11 font-semibold transition-all duration-200"
                      style={{
                        background: "oklch(0.18 0.03 280 / 0.6)",
                        border: "1px solid oklch(0.82 0.18 195 / 0.3)",
                        color: "oklch(0.82 0.18 195)",
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </Button>

                    <Button
                      data-ocid="cgpa.calculate_button"
                      type="button"
                      onClick={handleCalculate}
                      disabled={isLoading}
                      className="flex-1 h-11 font-bold text-base gap-2 transition-all duration-200"
                      style={{
                        background: isLoading
                          ? "oklch(0.55 0.10 195 / 0.5)"
                          : "linear-gradient(135deg, oklch(0.78 0.18 195), oklch(0.60 0.22 240))",
                        color: "oklch(0.08 0.02 280)",
                        border: "none",
                        boxShadow: isLoading
                          ? "none"
                          : "0 4px 20px oklch(0.82 0.18 195 / 0.35)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2
                            data-ocid="cgpa.result.loading_state"
                            className="w-4 h-4 animate-spin"
                          />
                          Calculating…
                        </>
                      ) : (
                        <>
                          <Calculator className="w-4 h-4" />
                          Calculate CGPA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── Upload Result Tab ─────────────────────────────── */
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                <div className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
                  {/* Header */}
                  <div>
                    <h2
                      className="font-display text-lg font-bold mb-1"
                      style={{ color: "oklch(0.90 0.06 280)" }}
                    >
                      AI-Powered Result Analysis
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload a photo of your marksheet or result card. Our AI
                      will extract all subjects and calculate your CGPA
                      automatically.
                    </p>
                  </div>

                  {/* Dropzone */}
                  {!uploadedImage ? (
                    <label
                      data-ocid="cgpa.dropzone"
                      htmlFor="result-image-input"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDropzoneDrop}
                      className="relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl cursor-pointer transition-all duration-200 select-none"
                      style={{
                        border: isDragging
                          ? "2px dashed oklch(0.82 0.18 195 / 0.8)"
                          : "2px dashed oklch(0.35 0.07 280 / 0.6)",
                        background: isDragging
                          ? "oklch(0.82 0.18 195 / 0.05)"
                          : "oklch(0.15 0.025 280 / 0.5)",
                        boxShadow: isDragging
                          ? "0 0 0 1px oklch(0.82 0.18 195 / 0.15), 0 0 30px oklch(0.82 0.18 195 / 0.1)"
                          : "none",
                      }}
                    >
                      <div
                        className="p-4 rounded-2xl transition-all duration-200"
                        style={{
                          background: isDragging
                            ? "oklch(0.82 0.18 195 / 0.15)"
                            : "oklch(0.20 0.04 280 / 0.8)",
                          border: `1px solid oklch(0.82 0.18 195 / ${isDragging ? "0.5" : "0.2"})`,
                          boxShadow: isDragging
                            ? "0 0 20px oklch(0.82 0.18 195 / 0.3)"
                            : "none",
                        }}
                      >
                        <CloudUpload
                          className="w-8 h-8 transition-colors duration-200"
                          style={{
                            color: isDragging
                              ? "oklch(0.82 0.18 195)"
                              : "oklch(0.65 0.10 195)",
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className="font-semibold text-sm mb-1"
                          style={{
                            color: isDragging
                              ? "oklch(0.82 0.18 195)"
                              : "oklch(0.80 0.05 280)",
                          }}
                        >
                          {isDragging
                            ? "Drop to upload"
                            : "Drop your result image here or click to upload"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports JPG, PNG, WEBP, PDF · Max 10 MB
                        </p>
                      </div>
                      <Button
                        data-ocid="cgpa.upload_button"
                        type="button"
                        size="sm"
                        onClick={(e) => e.preventDefault()}
                        asChild={false}
                        className="gap-2 font-semibold pointer-events-none"
                        style={{
                          background: "oklch(0.82 0.18 195 / 0.15)",
                          border: "1px solid oklch(0.82 0.18 195 / 0.4)",
                          color: "oklch(0.82 0.18 195)",
                        }}
                      >
                        <CloudUpload className="w-3.5 h-3.5" />
                        Choose File
                      </Button>
                      <input
                        id="result-image-input"
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileInputChange}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    /* ── Image preview ─────────────────────────── */
                    <div
                      className="relative rounded-2xl overflow-hidden"
                      style={{
                        border: "1px solid oklch(0.82 0.18 195 / 0.3)",
                        background: "oklch(0.14 0.025 280)",
                      }}
                    >
                      <div
                        className="flex items-center gap-3 p-3 border-b"
                        style={{ borderColor: "oklch(0.30 0.05 280 / 0.4)" }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "oklch(0.82 0.18 195)" }}
                        />
                        <span className="text-sm font-medium text-muted-foreground truncate flex-1">
                          {uploadedImage.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(uploadedImage.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={clearUpload}
                          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-150 hover:bg-destructive/20"
                          style={{ color: "oklch(0.63 0.22 25)" }}
                          aria-label="Remove uploaded file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {uploadedImage.type !== "application/pdf" &&
                        imagePreviewUrl && (
                          <img
                            src={imagePreviewUrl}
                            alt="Uploaded result preview"
                            className="w-full max-h-64 object-contain p-2"
                            style={{ background: "oklch(0.12 0.02 280)" }}
                          />
                        )}
                      {uploadedImage.type === "application/pdf" && (
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                          <span className="text-4xl">📄</span>
                          <p className="text-sm text-muted-foreground">
                            PDF ready for analysis
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading state */}
                  <AnimatePresence>
                    {isAnalysing && (
                      <motion.div
                        data-ocid="cgpa.analyse.loading_state"
                        key="analysing"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex flex-col items-center gap-3 py-4 rounded-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.55 0.22 295 / 0.08), oklch(0.40 0.15 280 / 0.06))",
                          border: "1px solid oklch(0.55 0.22 295 / 0.2)",
                        }}
                      >
                        <div className="relative">
                          <Loader2
                            className="w-8 h-8 animate-spin"
                            style={{ color: "oklch(0.75 0.20 295)" }}
                          />
                          <Brain
                            className="w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5"
                            style={{ color: "oklch(0.82 0.18 195)" }}
                          />
                        </div>
                        <div className="text-center">
                          <p
                            className="font-semibold text-sm"
                            style={{ color: "oklch(0.82 0.18 295)" }}
                          >
                            Analysing your result…
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            AI is reading your marksheet and extracting subjects
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error state */}
                  <AnimatePresence>
                    {analyseError && !isAnalysing && (
                      <motion.div
                        data-ocid="cgpa.analyse.error_state"
                        key="analyse-error"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-2xl p-4"
                        style={{
                          background: "oklch(0.15 0.04 25 / 0.5)",
                          border: "1px solid oklch(0.63 0.22 25 / 0.4)",
                        }}
                      >
                        <p
                          className="text-sm font-medium text-center"
                          style={{ color: "oklch(0.80 0.18 25)" }}
                        >
                          {analyseError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Extracted subjects preview */}
                  <AnimatePresence>
                    {extractedSubjects &&
                      extractedSubjects.length > 0 &&
                      !isAnalysing && (
                        <motion.div
                          data-ocid="cgpa.analyse.success_state"
                          key="extracted"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="rounded-2xl overflow-hidden"
                          style={{
                            background: "oklch(0.15 0.025 280 / 0.7)",
                            border: "1px solid oklch(0.82 0.18 195 / 0.25)",
                          }}
                        >
                          <div
                            className="flex items-center gap-2 px-4 py-3 border-b"
                            style={{
                              borderColor: "oklch(0.30 0.05 280 / 0.4)",
                              background: "oklch(0.82 0.18 195 / 0.06)",
                            }}
                          >
                            <Sparkles
                              className="w-3.5 h-3.5"
                              style={{ color: "oklch(0.82 0.18 195)" }}
                            />
                            <span
                              className="text-xs font-bold uppercase tracking-widest"
                              style={{ color: "oklch(0.82 0.18 195)" }}
                            >
                              {extractedSubjects.length} subjects detected
                            </span>
                          </div>
                          <div
                            className="divide-y"
                            style={{
                              borderColor: "oklch(0.25 0.04 280 / 0.4)",
                            }}
                          >
                            {extractedSubjects.map((item, idx) => (
                              <div
                                key={`extracted-${
                                  // biome-ignore lint/suspicious/noArrayIndexKey: static list from parse result
                                  idx
                                }`}
                                className="flex items-center gap-3 px-4 py-2.5"
                              >
                                <span
                                  className="font-display font-semibold text-xs w-5 shrink-0"
                                  style={{ color: "oklch(0.60 0.10 195)" }}
                                >
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <span className="flex-1 text-sm text-foreground truncate">
                                  {item.subject}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className="text-xs font-bold px-2 py-0.5 rounded-lg"
                                    style={{
                                      background: "oklch(0.82 0.18 195 / 0.12)",
                                      border:
                                        "1px solid oklch(0.82 0.18 195 / 0.25)",
                                      color: "oklch(0.82 0.18 195)",
                                    }}
                                  >
                                    {item.grade.toFixed(1)}
                                  </span>
                                  <span
                                    className="text-xs text-muted-foreground"
                                    title="Credits"
                                  >
                                    {item.credits} cr
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>

                  {/* Analyse button */}
                  <Button
                    data-ocid="cgpa.analyse_button"
                    type="button"
                    onClick={handleAnalyse}
                    disabled={isAnalysing || !uploadedImage || actorFetching}
                    className="w-full h-12 font-bold text-base gap-2 transition-all duration-200"
                    style={{
                      background:
                        isAnalysing || !uploadedImage || actorFetching
                          ? "oklch(0.35 0.08 280 / 0.5)"
                          : "linear-gradient(135deg, oklch(0.65 0.22 295), oklch(0.55 0.22 295), oklch(0.45 0.20 280))",
                      color:
                        isAnalysing || !uploadedImage || actorFetching
                          ? "oklch(0.50 0.04 280)"
                          : "oklch(0.98 0.005 280)",
                      border: "none",
                      boxShadow:
                        isAnalysing || !uploadedImage || actorFetching
                          ? "none"
                          : "0 4px 24px oklch(0.55 0.22 295 / 0.4)",
                    }}
                  >
                    {isAnalysing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Analyse &amp; Calculate CGPA
                      </>
                    )}
                  </Button>

                  {!GEMINI_API_KEY && (
                    <p
                      className="text-xs text-center"
                      style={{ color: "oklch(0.65 0.15 60)" }}
                    >
                      ⚠ AI analysis not configured — please use Manual Entry.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result card — shown for both tabs */}
          <AnimatePresence>
            {result !== null &&
              !isLoading &&
              !isAnalysing &&
              classification && (
                <motion.div
                  key="result"
                  data-ocid="cgpa.result_card"
                  initial={{ opacity: 0, scale: 0.88, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="mt-6 rounded-2xl overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.16 0.04 280 / 0.85), oklch(0.14 0.03 260 / 0.9))",
                    border: "1px solid oklch(0.82 0.18 195 / 0.4)",
                    boxShadow:
                      "0 0 0 1px oklch(0.82 0.18 195 / 0.1) inset, 0 8px 40px oklch(0.82 0.18 195 / 0.15), 0 0 80px oklch(0.82 0.18 195 / 0.08)",
                  }}
                >
                  <div
                    data-ocid="cgpa.result.success_state"
                    className="p-8 text-center relative overflow-hidden"
                  >
                    {/* Glow orb behind number */}
                    <div
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div
                        className="w-48 h-48 rounded-full opacity-20"
                        style={{
                          background:
                            "radial-gradient(circle, oklch(0.82 0.18 195 / 0.8) 0%, transparent 70%)",
                          filter: "blur(30px)",
                        }}
                      />
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles
                          className="w-4 h-4"
                          style={{ color: "oklch(0.82 0.18 195)" }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {activeTab === "upload"
                            ? "AI-Detected CGPA"
                            : "Your CGPA"}
                        </span>
                        <Sparkles
                          className="w-4 h-4"
                          style={{ color: "oklch(0.82 0.18 195)" }}
                        />
                      </div>

                      <div
                        className="font-display text-7xl md:text-8xl font-bold mb-3 leading-none"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.92 0.10 195), oklch(0.82 0.18 195), oklch(0.70 0.22 240))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          filter:
                            "drop-shadow(0 0 20px oklch(0.82 0.18 195 / 0.4))",
                        }}
                      >
                        {result.toFixed(2)}
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg mr-1">
                          {classification.icon}
                        </span>
                        <Badge
                          className="px-4 py-1 text-sm font-bold rounded-full"
                          style={{
                            background: "oklch(0.20 0.04 280 / 0.8)",
                            border: "1px solid oklch(0.82 0.18 195 / 0.3)",
                            color: "oklch(0.82 0.18 195)",
                          }}
                        >
                          {classification.label}
                        </Badge>
                      </div>

                      {/* Scale bar */}
                      <div className="mt-6 max-w-xs mx-auto">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>0</span>
                          <span>5</span>
                          <span>10</span>
                        </div>
                        <div
                          className="h-2 rounded-full relative overflow-hidden"
                          style={{
                            background: "oklch(0.20 0.03 280 / 0.8)",
                            border: "1px solid oklch(0.30 0.05 280 / 0.5)",
                          }}
                        >
                          <motion.div
                            className="absolute left-0 top-0 h-full rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(result / 10) * 100}%` }}
                            transition={{
                              duration: 0.8,
                              delay: 0.2,
                              ease: "easeOut",
                            }}
                            style={{
                              background:
                                "linear-gradient(90deg, oklch(0.78 0.18 195), oklch(0.65 0.22 240))",
                              boxShadow: "0 0 8px oklch(0.82 0.18 195 / 0.6)",
                            }}
                          />
                        </div>
                      </div>

                      {activeTab === "upload" && extractedSubjects && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          Calculated from {extractedSubjects.length} subjects
                          detected in your result image
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            {calcError && !isLoading && (
              <motion.div
                key="error"
                data-ocid="cgpa.result.error_state"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 rounded-2xl p-5 text-center"
                style={{
                  background: "oklch(0.15 0.04 25 / 0.5)",
                  border: "1px solid oklch(0.63 0.22 25 / 0.4)",
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.80 0.18 25)" }}
                >
                  {calcError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grade legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 glass rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.82 0.18 195)" }}
              />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Grade Reference
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {LETTER_GRADES.map((g) => (
                <div
                  key={g}
                  className="text-center rounded-lg py-2"
                  style={{
                    background: "oklch(0.18 0.03 280 / 0.5)",
                    border: "1px solid oklch(0.30 0.05 280 / 0.4)",
                  }}
                >
                  <div
                    className="font-display font-bold text-sm"
                    style={{ color: "oklch(0.82 0.18 195)" }}
                  >
                    {g}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {LETTER_TO_POINT[g]}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-6 px-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with ❤ using caffeine.ai
          </a>
        </p>
      </footer>

      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.18 0.04 280 / 0.95)",
            border: "1px solid oklch(0.35 0.07 280 / 0.6)",
            color: "oklch(0.95 0.01 280)",
          },
        }}
      />
    </div>
  );
}

/* ── SubjectRowItem ─────────────────────────────────────────────── */
interface SubjectRowProps {
  subject: SubjectRow;
  index: number;
  isOnly: boolean;
  onUpdate: (id: string, patch: Partial<SubjectRow>) => void;
  onRemove: (id: string) => void;
  onToggleMode: (id: string) => void;
}

function SubjectRowItem({
  subject,
  index,
  isOnly,
  onUpdate,
  onRemove,
  onToggleMode,
}: SubjectRowProps) {
  const rowNum = index + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl overflow-visible"
    >
      <div
        className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-start p-3 rounded-xl"
        style={{
          background: "oklch(0.16 0.025 280 / 0.6)",
          border: "1px solid oklch(0.30 0.05 280 / 0.4)",
        }}
      >
        {/* Subject label + mode toggle */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-display font-semibold text-sm shrink-0"
              style={{ color: "oklch(0.75 0.12 195)" }}
            >
              {String(rowNum).padStart(2, "0")}
            </span>
            <button
              data-ocid={`subject.toggle.${rowNum}`}
              type="button"
              onClick={() => onToggleMode(subject.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={
                subject.mode === "letter"
                  ? {
                      background: "oklch(0.55 0.22 295 / 0.25)",
                      border: "1px solid oklch(0.55 0.22 295 / 0.5)",
                      color: "oklch(0.80 0.18 295)",
                    }
                  : {
                      background: "oklch(0.82 0.18 195 / 0.15)",
                      border: "1px solid oklch(0.82 0.18 195 / 0.35)",
                      color: "oklch(0.82 0.18 195)",
                    }
              }
              title={`Switch to ${subject.mode === "number" ? "letter" : "number"} grade`}
            >
              {subject.mode === "number" ? (
                <>
                  <Hash className="w-3 h-3" />
                  Number
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Letter
                </>
              )}
            </button>
          </div>
        </div>

        {/* Grade input */}
        <div className="flex flex-col gap-1 w-20">
          {subject.mode === "number" ? (
            <Input
              data-ocid={`subject.grade_input.${rowNum}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.1}
              placeholder="0–10"
              value={subject.numberGrade}
              onChange={(e) =>
                onUpdate(subject.id, {
                  numberGrade: e.target.value,
                  errors: { ...subject.errors, grade: undefined },
                })
              }
              className="h-9 text-sm text-center font-semibold input-glass rounded-lg"
              style={
                subject.errors.grade
                  ? {
                      borderColor: "oklch(0.63 0.22 25 / 0.7)",
                      boxShadow: "0 0 0 2px oklch(0.63 0.22 25 / 0.15)",
                    }
                  : {}
              }
            />
          ) : (
            <div className="relative">
              <select
                data-ocid={`subject.grade_input.${rowNum}`}
                value={subject.letterGrade}
                onChange={(e) =>
                  onUpdate(subject.id, {
                    letterGrade: e.target.value as LetterGrade | "",
                    errors: { ...subject.errors, grade: undefined },
                  })
                }
                className="w-full h-9 px-2 rounded-lg text-sm font-semibold text-center appearance-none cursor-pointer input-glass"
                style={
                  subject.errors.grade
                    ? {
                        borderColor: "oklch(0.63 0.22 25 / 0.7)",
                        boxShadow: "0 0 0 2px oklch(0.63 0.22 25 / 0.15)",
                        color: "oklch(0.95 0.01 280)",
                      }
                    : { color: "oklch(0.95 0.01 280)" }
                }
              >
                <option
                  value=""
                  disabled
                  style={{ background: "oklch(0.14 0.025 280)" }}
                >
                  Grade
                </option>
                {LETTER_GRADES.map((g) => (
                  <option
                    key={g}
                    value={g}
                    style={{ background: "oklch(0.14 0.025 280)" }}
                  >
                    {g} ({LETTER_TO_POINT[g]})
                  </option>
                ))}
              </select>
            </div>
          )}
          {subject.errors.grade && (
            <span
              className="text-[10px] text-center leading-none"
              style={{ color: "oklch(0.73 0.20 25)" }}
            >
              {subject.errors.grade}
            </span>
          )}
        </div>

        {/* Credit input */}
        <div className="flex flex-col gap-1 w-20">
          <Input
            data-ocid={`subject.credit_input.${rowNum}`}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="Cr."
            value={subject.credit}
            onChange={(e) =>
              onUpdate(subject.id, {
                credit: e.target.value,
                errors: { ...subject.errors, credit: undefined },
              })
            }
            className="h-9 text-sm text-center font-semibold input-glass rounded-lg"
            style={
              subject.errors.credit
                ? {
                    borderColor: "oklch(0.63 0.22 25 / 0.7)",
                    boxShadow: "0 0 0 2px oklch(0.63 0.22 25 / 0.15)",
                  }
                : {}
            }
          />
          {subject.errors.credit && (
            <span
              className="text-[10px] text-center leading-none"
              style={{ color: "oklch(0.73 0.20 25)" }}
            >
              {subject.errors.credit}
            </span>
          )}
        </div>

        {/* Remove button */}
        <div className="flex items-start pt-0.5">
          <button
            data-ocid={`subject.delete_button.${rowNum}`}
            type="button"
            onClick={() => onRemove(subject.id)}
            disabled={isOnly}
            aria-label={`Remove subject ${rowNum}`}
            className="w-8 h-9 flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
            style={{
              background: "oklch(0.63 0.22 25 / 0.12)",
              border: "1px solid oklch(0.63 0.22 25 / 0.25)",
              color: "oklch(0.73 0.20 25)",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
