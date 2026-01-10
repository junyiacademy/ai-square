import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { createUserDataStorage } from "@/lib/services/user-data-storage";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);

    if (!auth) {
      console.log("[API] GET /api/user-data - authentication failed");
      return createUnauthorizedResponse();
    }

    const storage = createUserDataStorage();
    const userData = await storage.getUserData(auth.user.email);

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Failed to get user data:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);

    if (!auth) {
      console.log("[API] POST /api/user-data - authentication failed");
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { data } = body;

    const storage = createUserDataStorage();
    const savedData = await storage.saveUserData(auth.user.email, data);

    return NextResponse.json({
      success: true,
      data: savedData,
    });
  } catch (error) {
    console.error("Failed to save user data:", error);
    return NextResponse.json(
      { error: "Failed to save user data" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);

    if (!auth) {
      return createUnauthorizedResponse();
    }

    const storage = createUserDataStorage();
    const success = await storage.deleteUserData(auth.user.email);

    return NextResponse.json({
      success,
    });
  } catch (error) {
    console.error("Failed to delete user data:", error);
    return NextResponse.json(
      { error: "Failed to delete user data" },
      { status: 500 },
    );
  }
}
