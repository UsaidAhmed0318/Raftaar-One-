import { supabaseUrl, supabaseKey } from "@/lib/public-config";
import { siteUrl } from "@/lib/site";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { answerQuestion } from "@/lib/help";
import { z } from "zod";
import {
  orderSchema,
  bookingSchema,
  applicationSchema,
  statusSchema,
  productSchema,
  avatarSchema,
} from "@/lib/validation";
export const runtime = "nodejs";
const fail = (error: string, status = 400) =>
  NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const site = siteUrl();
  if (!site) return fail("Server setup incomplete", 503);
  if (req.headers.get("origin") !== new URL(site).origin)
    return fail("Origin not allowed", 403);
  if (!req.headers.get("content-type")?.includes("application/json"))
    return fail("JSON required", 415);
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return fail("Sign in required", 401);
  const url = supabaseUrl,
    key = supabaseKey;
  if (!url || !key) return fail("Database setup pending", 503);
  const db = createClient(url, key, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser(token);
  if (authError || !user) return fail("Please sign in again", 401);
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 16000)
    return fail("Request too large", 413);
  try {
    const body = JSON.parse(text);
    let response;
    if (action === "orders") {
      const p = orderSchema.parse(body);
      response = await db.rpc("create_order", {
        p_request_id: p.requestId,
        p_items: p.items,
        p_address: p.address,
        p_phone: p.phone,
        p_city: p.city,
        p_expected_total: p.expectedTotal,
      });
    } else if (action === "bookings") {
      const p = bookingSchema.parse(body);
      response = await db.rpc("create_booking", {
        p_request_id: p.requestId,
        p_service: p.service,
        p_city: p.city,
        p_pickup: p.pickup,
        p_destination: p.destination,
        p_phone: p.phone,
        p_offer: p.offer,
        p_notes: p.notes,
      });
    } else if (action === "applications") {
      const p = applicationSchema.parse(body);
      response = await db.rpc("apply_partner", {
        p_kind: p.kind,
        p_city: p.city,
        p_phone: p.phone,
        p_details: p.details,
        p_photo: p.photoPath ?? null,
        p_vehicles: p.vehicles ?? [],
        p_model: p.vehicleModel ?? "",
        p_plate: p.vehiclePlate ?? "",
      });
      if (
        response.error &&
        (response.error.code === "PGRST202" ||
          /could not find the function/i.test(response.error.message))
      ) {
        // Database without the rides migration: keep the application working by storing the driver details in the description.
        if (!["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"].includes(p.city))
          return fail(
            "Applications from this city are opening soon. Please contact us on WhatsApp and we will add you.",
            503,
          );
        const extra =
          p.kind === "Driver"
            ? " | Vehicles: " +
              (p.vehicles ?? []).join(", ") +
              " | Model: " +
              (p.vehicleModel ?? "") +
              " | Plate: " +
              (p.vehiclePlate ?? "")
            : "";
        response = await db.rpc("apply_partner", {
          p_kind: p.kind,
          p_city: p.city,
          p_phone: p.phone,
          p_details: (p.details + extra).slice(0, 1000),
        });
      }
    } else if (action === "admin") {
      const p = statusSchema.parse(body);
      response = await db.rpc("change_status", {
        p_entity: p.entity,
        p_id: p.id,
        p_status: p.status,
      });
    } else if (action === "products") {
      const p = productSchema.parse(body);
      response = await db.rpc("save_product", {
        p_id: p.id,
        p_name: p.name,
        p_category: p.category,
        p_description: p.description,
        p_price: p.price,
        p_stock: p.stock,
        p_active: p.active,
        p_image: p.imagePath ?? null,
      });
    } else if (action === "avatar") {
      const p = avatarSchema.parse(body);
      response = await db.rpc("set_avatar", { p_path: p.path });
    } else if (action === "assistant") {
      const { question } = z
        .object({ question: z.string().trim().min(2).max(800) })
        .parse(body);
      const limit = await db.rpc("consume_limit", { p_scope: "assistant" });
      if (limit.error || !limit.data)
        return fail("Please wait a minute before asking again", 429);
      const result = answerQuestion(question);
      return NextResponse.json(
        { answer: result.answer, related: result.related, mode: "help" },
        { headers: { "Cache-Control": "no-store" } },
      );
    } else return fail("Not found", 404);
    if (response.error) {
      const m = response.error.message;
      if (
        response.error.code === "PGRST202" ||
        /could not find the function/i.test(m)
      )
        return fail(
          "This feature is being switched on. Please try again in a little while, or contact us on WhatsApp.",
          503,
        );
      const safe = [
        "Sign in required",
        "Too many requests",
        "Item unavailable or insufficient stock",
        "Invalid transition",
        "Admin only",
        "Invalid image",
        "Choose the vehicle types you drive",
        "Vehicle model and plate number are required",
        "Prices changed. Refresh your cart and confirm the new total.",
      ];
      return fail(
        safe.includes(m)
          ? m
          : "Could not save. Check inputs, availability and whether this was already submitted.",
        m === "Admin only" ? 403 : 400,
      );
    }
    return NextResponse.json(
      { id: response.data, ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return fail(error.issues[0]?.message || "Invalid input");
    if (error instanceof SyntaxError) return fail("Invalid JSON");
    return fail("Service temporarily unavailable. Please retry later.", 503);
  }
}
