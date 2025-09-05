import { json } from "@sveltejs/kit";
import { query } from "$lib/database.js";
import { DEFAULT_TENANT_ID } from "$lib/constants.js";
import pkg from "agora-token";
const { RtcTokenBuilder, RtcRole } = pkg;

// Agora credentials - in production, these should be environment variables
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || ""; // You'll need to set this

// POST /api/agora/generate-token - Generate a new Agora token
export async function POST({ request, url }) {
  try {
    const body = await request.json();
    const { channel, uid = 0, role = "publisher", expire_hours = 24 } = body;
    const tenant_id = url.searchParams.get("tenant_id") || DEFAULT_TENANT_ID;

    // Validation
    if (!channel) {
      return json(
        {
          success: false,
          error: "Channel name is required",
        },
        { status: 400 },
      );
    }

    if (!APP_CERTIFICATE) {
      return json(
        {
          success: false,
          error:
            "Agora app certificate not configured. Please set AGORA_APP_CERTIFICATE environment variable.",
          code: "MISSING_APP_CERTIFICATE",
          instructions: {
            message:
              "To enable automatic token generation, you need to configure your Agora App Certificate:",
            steps: [
              "1. Go to the Agora Console (https://console.agora.io/)",
              "2. Select your project",
              "3. Go to Project Settings > Features",
              '4. Enable "App Certificate" and copy the certificate',
              "5. Add AGORA_APP_CERTIFICATE=your_certificate to your .env file",
              "6. Restart the server",
            ],
            fallback:
              "For now, you can still generate tokens manually from the Agora Console and paste them in the modal.",
          },
        },
        { status: 500 },
      );
    }

    if (expire_hours > 24) {
      return json(
        {
          success: false,
          error: "Token expiration cannot exceed 24 hours (Agora limitation)",
        },
        { status: 400 },
      );
    }

    // Calculate expiration timestamp (max 24 hours)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expirationTimestamp = currentTimestamp + expire_hours * 3600;

    // Determine role
    const agoraRole =
      role === "audience" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channel,
      uid,
      agoraRole,
      expirationTimestamp,
    );

    // Save token to database
    try {
      await query(
        `
                INSERT INTO settings (tenant_id, setting_key, setting_value, metadata)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (tenant_id, setting_key)
                DO UPDATE SET
                    setting_value = EXCLUDED.setting_value,
                    metadata = EXCLUDED.metadata,
                    updated_at = now()
            `,
        [
          tenant_id,
          "agora_token",
          token,
          {
            generated_at: new Date().toISOString(),
            expires_at: new Date(expirationTimestamp * 1000).toISOString(),
            channel: channel,
            uid: uid,
            role: role,
            auto_generated: true,
          },
        ],
      );

      // Also save/update the channel
      await query(
        `
                INSERT INTO settings (tenant_id, setting_key, setting_value, metadata)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (tenant_id, setting_key)
                DO UPDATE SET
                    setting_value = EXCLUDED.setting_value,
                    metadata = EXCLUDED.metadata,
                    updated_at = now()
            `,
        [
          tenant_id,
          "agora_channel",
          channel,
          {
            saved_at: new Date().toISOString(),
            auto_updated: true,
          },
        ],
      );
    } catch (dbError) {
      console.error("Database error while saving token:", dbError);
      // Continue even if database save fails - return the token
    }

    return json({
      success: true,
      token: token,
      channel: channel,
      uid: uid,
      role: role,
      expires_at: new Date(expirationTimestamp * 1000).toISOString(),
      expires_in_seconds: expire_hours * 3600,
      app_id: APP_ID,
      message: `Token generated successfully, expires in ${expire_hours} hour(s)`,
    });
  } catch (error) {
    console.error("Generate token error:", error);

    // Handle specific Agora errors
    if (error.message.includes("Invalid App Certificate")) {
      return json(
        {
          success: false,
          error: "Invalid Agora app certificate configured",
          code: "INVALID_APP_CERTIFICATE",
        },
        { status: 500 },
      );
    }

    return json(
      {
        success: false,
        error: "Failed to generate Agora token",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// GET /api/agora/generate-token - Get token status/info
export async function GET({ url }) {
  try {
    const tenant_id = url.searchParams.get("tenant_id") || DEFAULT_TENANT_ID;

    // Get current token info
    const result = await query(
      `
            SELECT setting_value, metadata, updated_at
            FROM settings
            WHERE tenant_id = $1 AND setting_key = 'agora_token'
        `,
      [tenant_id],
    );

    if (result.rows.length === 0) {
      return json(
        {
          success: false,
          error: "No token found",
          has_token: false,
        },
        { status: 404 },
      );
    }

    const tokenData = result.rows[0];
    const metadata = tokenData.metadata || {};

    // Check if token is expired
    const now = new Date();
    const expiresAt = metadata.expires_at
      ? new Date(metadata.expires_at)
      : null;
    const isExpired = expiresAt ? now >= expiresAt : false;

    // Calculate time remaining
    const timeRemaining = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      : 0;

    return json({
      success: true,
      has_token: true,
      is_expired: isExpired,
      expires_at: metadata.expires_at,
      time_remaining_seconds: timeRemaining,
      time_remaining_hours: Math.floor(timeRemaining / 3600),
      channel: metadata.channel,
      auto_generated: metadata.auto_generated || false,
      last_updated: tokenData.updated_at,
      can_generate: !APP_CERTIFICATE ? false : true,
      app_certificate_configured: !!APP_CERTIFICATE,
    });
  } catch (error) {
    console.error("Get token status error:", error);
    return json(
      {
        success: false,
        error: "Failed to get token status",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
