import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, sessionStorage } from "../shopify.server";
import { apiVersion } from "../shopify.server";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";

// CORS headers helper
const corsHeaders = (origin: string | null) => {
  // Allow requests from Shopify storefronts and common domains
  const allowedOrigins = [
    /^https:\/\/.*\.myshopify\.com$/,
    /^https:\/\/.*\.shopify\.com$/,
    origin || "", // Allow the specific origin from request
  ];

  const originHeader = origin && allowedOrigins.some(allowed => 
    typeof allowed === "string" ? allowed === origin : allowed.test(origin)
  ) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
};

// Handle OPTIONS for CORS preflight
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return json(
    { message: "Activation API endpoint. Use POST to save activation codes." },
    { headers }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Read form data once (FormData can only be read once per request)
  const formData = await request.formData();
  
  // Get shop domain from multiple sources in priority order
  // Note: Custom headers may be blocked by CORS, so FormData is more reliable
  let shopDomain = 
    formData.get("shop")?.toString() ||
    request.headers.get("X-Shopify-Shop-Domain") ||
    new URL(request.url).searchParams.get("shop") ||
    "";

  // Extract shop domain from Origin or Referer if still not found
  if (!shopDomain) {
    const origin = request.headers.get("Origin") || "";
    const referer = request.headers.get("Referer") || "";
    const source = origin || referer;
    
    if (source) {
      // Match patterns like: https://h1e4vg-m3.myshopify.com
      const shopMatch = source.match(/https?:\/\/([^\/]+)/);
      if (shopMatch && shopMatch[1].includes("myshopify.com")) {
        shopDomain = shopMatch[1];
      }
    }
  }

  // Normalize shop domain - ensure it's in the correct format
  if (shopDomain) {
    // Remove protocol if present
    shopDomain = shopDomain.replace(/^https?:\/\//, "");
    // Remove trailing slash
    shopDomain = shopDomain.replace(/\/$/, "");
    // Ensure it includes .myshopify.com if it's a Shopify shop
    if (!shopDomain.includes(".") && shopDomain.endsWith(".myshopify.com") === false) {
      // If it's just the shop name, we need the full domain
      // But shop.permanent_domain should already include .myshopify.com
    }
  }

  // Log for debugging (remove in production)
  console.log("Shop domain extraction:", {
    header: request.headers.get("X-Shopify-Shop-Domain"),
    formDataShop: formData.get("shop"),
    referer: request.headers.get("Referer"),
    normalized: shopDomain,
  });

  let admin;

  // Try different authentication methods
  try {
    // Method 1: Try admin authentication (for app-admin calls)
    const authResult = await authenticate.admin(request);
    admin = authResult.admin;
  } catch {
    try {
      // Method 2: Try app proxy authentication (for storefront app proxy calls)
      const proxyResult = await authenticate.public.appProxy(request);
      admin = proxyResult.admin;
    } catch {
      // Method 3: For direct storefront calls, get session from shop domain
      if (shopDomain) {
        try {
          // Get sessions for the shop using sessionStorage
          const sessions = await sessionStorage.findSessionsByShop(shopDomain);
          if (sessions && sessions.length > 0) {
            // Use the first offline session (usually the one we want for API calls)
            const session = sessions.find((s: any) => !s.isOnline) || sessions[0];
            if (session && session.accessToken) {
              // Create Shopify API instance to get GraphQL client
              const shopify = shopifyApi({
                apiKey: process.env.SHOPIFY_API_KEY || "",
                apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
                apiVersion: apiVersion || LATEST_API_VERSION,
                scopes: process.env.SCOPES?.split(",") || [],
                hostName: process.env.SHOPIFY_APP_URL?.replace(/^https?:\/\//, "") || "",
                isEmbeddedApp: true,
              });

              // Create GraphQL client from session
              const adminGraphql = new shopify.clients.Graphql({ session });
              
              // Create a compatible admin object that matches the expected interface
              admin = {
                graphql: async (query: string, options?: any) => {
                  try {
                    const response = await adminGraphql.request(query, options?.variables || {});
                    return {
                      json: async () => ({ data: response }),
                      ok: true,
                      status: 200,
                    } as Response;
                  } catch (err: any) {
                    return {
                      json: async () => ({ 
                        data: null, 
                        errors: err?.response?.errors || [{ message: err.message }] 
                      }),
                      ok: false,
                      status: 400,
                    } as Response;
                  }
                },
              } as any;
            } else {
              throw new Error("No valid session found");
            }
          } else {
            return json(
              {
                success: false,
                error: "App not installed or session expired. Please reinstall the app.",
              },
              { status: 401, headers }
            );
          }
        } catch (sessionError: any) {
          console.error("Session error:", sessionError);
          return json(
            {
              success: false,
              error: sessionError?.message || "Authentication failed. Please ensure the app is installed on your store.",
            },
            { status: 401, headers }
          );
        }
      } else {
        // Return detailed error for debugging
        return json(
          {
            success: false,
            error: "Shop domain required. Please ensure shop parameter is sent.",
            debug: {
              receivedShopDomain: shopDomain || null,
              headers: {
                "X-Shopify-Shop-Domain": request.headers.get("X-Shopify-Shop-Domain"),
                "Origin": request.headers.get("Origin"),
                "Referer": request.headers.get("Referer"),
              },
              formDataShop: formData.get("shop"),
              urlParams: new URL(request.url).searchParams.get("shop"),
            },
          },
          { status: 400, headers }
        );
      }
    }
  }

  try {
    // FormData already read above, use the same instance
    const customerId = formData.get("customer_id")?.toString() || "";
    const activationCode = formData.get("activation_code")?.toString() || "";

    if (!customerId || !activationCode) {
      return json(
        { success: false, error: "Missing customer_id or activation_code" },
        { status: 400, headers }
      );
    }

    // Convert customer ID to GID format if needed
    const customerGid = customerId.startsWith("gid://")
      ? customerId
      : `gid://shopify/Customer/${customerId}`;

    // Use metafieldsSet which handles both create and update automatically
    const setMetafieldMutation = `#graphql
      mutation setCustomerMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    if (!admin) {
      return json(
        { success: false, error: "Admin API not available" },
        { status: 500, headers }
      );
    }

    const setResponse = await admin.graphql(setMetafieldMutation, {
      variables: {
        metafields: [
          {
            ownerId: customerGid,
            namespace: "custom",
            key: "activation_code",
            value: activationCode,
            type: "single_line_text_field",
          },
        ],
      },
    });

    const setData = await setResponse.json();

    if (setData?.data?.metafieldsSet?.userErrors?.length > 0) {
      return json(
        {
          success: false,
          errors: setData.data.metafieldsSet.userErrors,
        },
        { status: 400, headers }
      );
    }

    return json({ success: true }, { headers });
  } catch (error) {
    console.error("Error saving activation code:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers }
    );
  }
};

