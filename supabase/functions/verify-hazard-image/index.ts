// ============================================================
// PAHAADSAATHI — Supabase Edge Function: verify-hazard-image
//
// Analyzes uploaded hazard photographs against user descriptions
// using the NVIDIA PaliGemma Vision-Language Model.
//
// Endpoint: POST /functions/v1/verify-hazard-image
// Payload:  { "hazard_id": "<UUID>", "force": false }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NVIDIA_PALIGEMMA_ENDPOINT = "https://ai.api.nvidia.com/v1/vlm/google/paligemma";
const MODEL_NAME = "google/paligemma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationPayload {
  hazard_id: string;
  force?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const nvidiaApiKey = Deno.env.get("NVIDIA_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase service configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nvidiaApiKey) {
      return new Response(
        JSON.stringify({ error: "NVIDIA_API_KEY not configured on backend" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { hazard_id, force = false } = (await req.json()) as VerificationPayload;

    if (!hazard_id) {
      return new Response(
        JSON.stringify({ error: "hazard_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Retrieve hazard report
    const { data: hazard, error: hazardError } = await supabase
      .from("hazards")
      .select("*")
      .eq("id", hazard_id)
      .single();

    if (hazardError || !hazard) {
      return new Response(
        JSON.stringify({ error: `Hazard not found: ${hazardError?.message || "Invalid ID"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency: Return existing completed verification unless force=true
    if (!force && hazard.ai_verification_status === "completed" && hazard.ai_verification_result) {
      return new Response(
        JSON.stringify({
          success: true,
          hazard_id,
          status: "completed",
          verdict: hazard.ai_verification_verdict,
          result: hazard.ai_verification_result,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no photograph exists
    if (!hazard.photo_url) {
      const emptyResult = {
        hazard_visible: false,
        detected_hazard: "none",
        reported_hazard: hazard.type,
        verdict: "INSUFFICIENT_EVIDENCE",
        description_match: false,
        visual_evidence: ["No photograph was attached to this report"],
        contradictions: [],
        image_quality: "unclear",
        possible_image_reuse: "not_determined",
        manipulation_indicators: "not_determined",
        explanation: "Verification requires an uploaded photograph.",
        human_review_recommended: true,
        model: MODEL_NAME,
        verified_at: new Date().toISOString(),
      };

      await supabase
        .from("hazards")
        .update({
          ai_verification_status: "completed",
          ai_verification_verdict: "insufficient_evidence",
          ai_verification_result: emptyResult,
          ai_verified_at: new Date().toISOString(),
        })
        .eq("id", hazard_id);

      return new Response(
        JSON.stringify({ success: true, hazard_id, status: "completed", verdict: "insufficient_evidence", result: emptyResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Retrieve and prepare image
    const imageRes = await fetch(hazard.photo_url);
    if (!imageRes.ok) {
      throw new Error(`Failed to download hazard photo (HTTP ${imageRes.status})`);
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(imageBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Step 3: Invoke NVIDIA PaliGemma Vision API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const nvidiaRes = await fetch(NVIDIA_PALIGEMMA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${nvidiaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "caption en" },
              { type: "image_url", image_url: dataUrl },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (nvidiaRes.status === 429) {
      await supabase
        .from("hazards")
        .update({
          ai_verification_status: "failed",
          ai_verification_error_code: "RATE_LIMIT_EXCEEDED",
        })
        .eq("id", hazard_id);

      return new Response(
        JSON.stringify({
          success: false,
          hazard_id,
          status: "failed",
          error_code: "RATE_LIMIT_EXCEEDED",
          message: "NVIDIA API rate limit reached. Report queued for manual review.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nvidiaRes.ok) {
      const errText = await nvidiaRes.text();
      throw new Error(`NVIDIA API HTTP ${nvidiaRes.status}: ${errText}`);
    }

    const nvidiaData = await nvidiaRes.json();
    const caption = nvidiaData.choices?.[0]?.message?.content || "";

    // Step 4: Parse & Evaluate Evidence
    const lowerCaption = caption.toLowerCase();
    const targetType = (hazard.type || "Landslide").toLowerCase();
    const isLandslide = lowerCaption.includes("rock") || lowerCaption.includes("landslide") || lowerCaption.includes("debris") || lowerCaption.includes("boulder");
    const isTree = lowerCaption.includes("tree") || lowerCaption.includes("branch") || lowerCaption.includes("log");
    const isFlood = lowerCaption.includes("water") || lowerCaption.includes("flood") || lowerCaption.includes("submerged");

    let verdict: "CONSISTENT" | "PARTIALLY_CONSISTENT" | "INCONSISTENT" | "INSUFFICIENT_EVIDENCE" = "INSUFFICIENT_EVIDENCE";
    let detectedHazard = "none";
    let hazardVisible = false;

    if (isLandslide) {
      detectedHazard = "landslide";
      hazardVisible = true;
    } else if (isTree) {
      detectedHazard = "fallen_trees";
      hazardVisible = true;
    } else if (isFlood) {
      detectedHazard = "waterlogging";
      hazardVisible = true;
    }

    if (hazardVisible && detectedHazard.includes(targetType.slice(0, 4))) {
      verdict = "CONSISTENT";
    } else if (hazardVisible) {
      verdict = "INCONSISTENT";
    } else if (lowerCaption.includes("door") || lowerCaption.includes("indoor") || lowerCaption.includes("sign")) {
      verdict = "INCONSISTENT";
    } else {
      verdict = "INSUFFICIENT_EVIDENCE";
    }

    const result = {
      hazard_visible: hazardVisible,
      detected_hazard: detectedHazard,
      reported_hazard: hazard.type,
      verdict,
      description_match: verdict === "CONSISTENT",
      visual_evidence: [caption],
      contradictions: verdict === "INCONSISTENT" ? [`Photograph shows unrelated content: ${caption}`] : [],
      image_quality: "good",
      possible_image_reuse: "not_determined",
      manipulation_indicators: "not_determined",
      explanation: `Photograph indicates: "${caption}". Findings evaluated as ${verdict}.`,
      human_review_recommended: verdict !== "CONSISTENT",
      raw_caption: caption,
      model: MODEL_NAME,
      verified_at: new Date().toISOString(),
    };

    // Step 5: Save Result
    await supabase
      .from("hazards")
      .update({
        ai_verification_status: "completed",
        ai_verification_verdict: verdict.toLowerCase(),
        ai_verification_result: result,
        ai_verified_at: new Date().toISOString(),
        ai_verification_model: MODEL_NAME,
      })
      .eq("id", hazard_id);

    return new Response(
      JSON.stringify({ success: true, hazard_id, status: "completed", verdict: verdict.toLowerCase(), result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal verification error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
