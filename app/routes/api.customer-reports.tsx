import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const corsHeaders = (origin: string | null) => ({
  ...baseCorsHeaders,
  "Access-Control-Allow-Origin": origin || "*",
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseCorsHeaders });
  }
  return new Response("Method Not Allowed", {
    status: 405,
    headers: baseCorsHeaders,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const formData = await request.formData();
    const customerIdRaw = formData.get("customer_id");
    const shopDomain =
      formData.get("shop")?.toString() ||
      request.headers.get("X-Shopify-Shop-Domain") ||
      process.env.SHOPIFY_SHOP_DOMAIN ||
      "";

    if (!customerIdRaw) {
      return json(
        { success: false, error: "customer_id is required" },
        { status: 400, headers },
      );
    }

    if (!shopDomain) {
      return json(
        { success: false, error: "Shop domain required" },
        { status: 400, headers },
      );
    }

    const normalizedShop = shopDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    const adminApiVersion =
      process.env.SHOPIFY_ADMIN_API_VERSION || "2025-07";
    const adminGraphqlUrl = `https://${normalizedShop}/admin/api/${adminApiVersion}/graphql.json`;
    const adminAccessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

    if (!adminAccessToken) {
      return json(
        { success: false, error: "SHOPIFY_ADMIN_API_TOKEN not configured" },
        { status: 500, headers },
      );
    }

    const ownerGid = `gid://shopify/Customer/${String(customerIdRaw).trim()}`;

    const query = `
      query GetCustomerReports($id: ID!) {
        customer(id: $id) {
          id
          displayName
          email
          metafield(namespace: "custom", key: "lab_reports") {
            value
          }
        }
      }
    `;

    const response = await fetch(adminGraphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: JSON.stringify({ query, variables: { id: ownerGid } }),
    });

    const data = await response.json();

    if (data.errors) {
      return json(
        {
          success: false,
          error: data.errors[0]?.message || "GraphQL error",
          errors: data.errors,
        },
        { status: 400, headers },
      );
    }

    const rawValue =
      data?.data?.customer?.metafield?.value && typeof data.data.customer.metafield.value === "string"
        ? data.data.customer.metafield.value
        : "";

    const reports = parseReports(rawValue);

    return json({ success: true, reports }, { status: 200, headers });
  } catch (error) {
    console.error("customer-reports error:", error);
    return json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to load reports",
      },
      { status: 500, headers: baseCorsHeaders },
    );
  }
};

type RawReport = Record<string, unknown>;

const parseReports = (raw: string | null | undefined) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry, index) => normalizeReport(entry, index));
    }
    if (typeof parsed === "object" && parsed !== null) {
      return [normalizeReport(parsed as RawReport, 0)];
    }
    return [];
  } catch (error) {
    console.error("Failed to parse reports metafield", error);
    return [];
  }
};

const normalizeReport = (entry: RawReport, index: number) => {
  const getString = (value: unknown, fallback = "") =>
    typeof value === "string" ? value : fallback;

  const getNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  return {
    id: getString(entry.id, `report-${index}`),
    sampleId:
      getString(entry.sampleId) || getString(entry.sample_id) || "—",
    patientName:
      getString(entry.patientName) || getString(entry.patient_name) || "—",
    sampleDate:
      getString(entry.sampleDate) || getString(entry.sample_date) || "",
    reportDate:
      getString(entry.reportDate) || getString(entry.report_date) || "",
    nadValue:
      getNumber(entry.nadValue) ??
      getNumber(entry.nad_value) ??
      getNumber(entry.nad),
    nadUrl: getString(entry.nadUrl) || getString(entry.nad_url) || "",
    shortReportUrl:
      getString(entry.shortReportUrl) ||
      getString(entry.short_report_url) ||
      "",
  };
};

