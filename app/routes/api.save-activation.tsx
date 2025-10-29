import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, sessionStorage } from "../shopify.server";
import { GraphqlClient } from "@shopify/shopify-api";
import { apiVersion } from "../shopify.server";

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

  // Get shop domain from referer or header
  const referer = request.headers.get("Referer") || "";
  const shopHeader = request.headers.get("X-Shopify-Shop-Domain");
  let shopDomain = shopHeader;

  // Extract shop domain from referer if available
  if (!shopDomain && referer) {
    const shopMatch = referer.match(/https?:\/\/([^.]+\.myshopify\.com)/);
    if (shopMatch) {
      shopDomain = shopMatch[1];
    }
  }

  // Get shop from query params or form data as fallback
  if (!shopDomain) {
    const url = new URL(request.url);
    shopDomain = url.searchParams.get("shop") || "";
  }

  if (!shopDomain) {
    const formData = await request.formData();
    shopDomain = (formData.get("shop") as string) || "";
  }

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
              // Create GraphQL client directly
              const client = new GraphqlClient({
                session,
                apiVersion,
              });
              
              // Create a compatible admin object that matches the expected interface
              admin = {
                graphql: async (query: string, options?: any) => {
                  try {
                    const response = await client.request(query, options?.variables || {});
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
        return json(
          {
            success: false,
            error: "Shop domain required. Please ensure shop parameter is sent.",
          },
          { status: 400, headers }
        );
      }
    }
  }

  try {
    const formData = await request.formData();
    const customerId = formData.get("customer_id") as string;
    const activationCode = formData.get("activation_code") as string;

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

