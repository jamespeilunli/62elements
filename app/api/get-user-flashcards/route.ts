import { supabase } from "../../../lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const setIdStr = searchParams.get("set-id");
  if (!setIdStr) {
    return NextResponse.json({ error: `Did not pass valid url param set-id: ${setIdStr}` }, { status: 400 });
  }
  const setId = parseInt(setIdStr);

  const { data, error } = await supabase
    .from("flashcards")
    .select(
      `
      uid,
      id,
      set,
      term,
      definition,
      user_flashcards!left(
        weight,
        last_attempt
      )
    `,
    )
    .eq("set", setId)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
