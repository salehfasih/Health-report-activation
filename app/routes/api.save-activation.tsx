import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// CORS headers helper
const corsHeaders = (origin: string | null) => {
  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": origin || "*",
  };
};

// Handle OPTIONS for CORS preflight
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseCorsHeaders });
  }
  return new Response("Method Not Allowed", { status: 405, headers: baseCorsHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const formData = await request.formData();
    const customerIdRaw = formData.get("customer_id");
    const activationCode = formData.get("activation_code");

    if (!customerIdRaw || !activationCode) {
      return json(
        { success: false, error: "Missing customer_id or activation_code" },
        { status: 400, headers }
      );
    }

    // Get shop domain from form data or environment
    const shopDomain = 
      formData.get("shop")?.toString() ||
      request.headers.get("X-Shopify-Shop-Domain") ||
      process.env.SHOPIFY_SHOP_DOMAIN ||
      "h1e4vg-m3.myshopify.com";

    if (!shopDomain) {
      return json(
        { success: false, error: "Shop domain required" },
        { status: 400, headers }
      );
    }

    // Normalize shop domain
    const normalizedShop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

    // Build GraphQL endpoint URL
    const adminApiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-07";
    const adminGraphqlUrl = `https://${normalizedShop}/admin/api/${adminApiVersion}/graphql.json`;

    // Get admin access token from environment
    const adminAccessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

    if (!adminAccessToken) {
      return json(
        { success: false, error: "SHOPIFY_ADMIN_API_TOKEN not configured" },
        { status: 500, headers }
      );
    }

    // Prepare GraphQL mutation
    const ownerGid = `gid://shopify/Customer/${String(customerIdRaw).trim()}`;

    const mutation = `
      mutation SaveCustomerCode($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { 
            id 
            key 
            namespace 
            value 
          }
          userErrors { 
            field 
            message 
          }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          ownerId: ownerGid,
          namespace: "custom",
          key: "activation_code",
          type: "single_line_text_field",
          value: String(activationCode),
        },
      ],
    };

    // Call Shopify Admin API directly
    const resp = await fetch(adminGraphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const data = await resp.json();

    // Check for GraphQL errors
    if (data.errors) {
      return json(
        {
          success: false,
          error: data.errors[0]?.message || "GraphQL error",
          errors: data.errors,
        },
        { status: 400, headers }
      );
    }

    // Check for user errors from metafieldsSet
    const userErrors = data?.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      return json(
        {
          success: false,
          errors: userErrors,
          error: userErrors[0]?.message || "Failed to save metafield",
        },
        { status: 400, headers }
      );
    }

    return json({ success: true }, { status: 200, headers });
  } catch (error) {
    console.error("save-activation error:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500, headers: baseCorsHeaders }
    );
  }
};


