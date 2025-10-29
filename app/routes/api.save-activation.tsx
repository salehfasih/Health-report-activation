import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Handle both GET (for testing) and POST requests
export const loader = async ({ request }: ActionFunctionArgs) => {
  return json({ message: "Activation API endpoint. Use POST to save activation codes." });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // For customer-facing API calls from theme app blocks, use app proxy
  // App proxy URLs should be configured in Shopify Partners dashboard:
  // Format: /apps/{app_subpath}/api/save-activation
  // For theme app blocks, update the fetch URL to use app proxy path
  let admin;
  
  try {
    // Try admin authentication first (for app-admin calls)
    const authResult = await authenticate.admin(request);
    admin = authResult.admin;
  } catch {
    // Try app proxy authentication for storefront calls
    try {
      const proxyResult = await authenticate.public.appProxy(request);
      admin = proxyResult.admin;
    } catch {
      return json(
        { 
          success: false, 
          error: "Authentication required. Ensure app proxy is configured for storefront calls." 
        },
        { status: 401 }
      );
    }
  }

  try {
    const formData = await request.formData();
    const customerId = formData.get("customer_id") as string;
    const activationCode = formData.get("activation_code") as string;

    if (!customerId || !activationCode) {
      return json(
        { success: false, error: "Missing customer_id or activation_code" },
        { status: 400 }
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
        { status: 500 }
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
        { status: 400 }
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error saving activation code:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
};

