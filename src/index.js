import { generateDescription } from "./generate.js";
import { validatePayload } from "./validation.js";

const MAX_BODY_BYTES = 10 * 1024;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function errorResponse(status, code, message, fields, headers) {
  const error = { code, message };
  if (fields?.length) error.fields = fields;
  return jsonResponse({ error }, status, headers);
}

async function readPayload(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { error: errorResponse(413, "PAYLOAD_TOO_LARGE", "提交内容过长，请精简后重试。") };
  }

  let rawBody;
  try {
    rawBody = await request.arrayBuffer();
  } catch {
    return { error: errorResponse(400, "INVALID_JSON", "无法读取提交内容。") };
  }
  if (rawBody.byteLength > MAX_BODY_BYTES) {
    return { error: errorResponse(413, "PAYLOAD_TOO_LARGE", "提交内容过长，请精简后重试。") };
  }

  try {
    return { payload: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody)) };
  } catch {
    return { error: errorResponse(400, "INVALID_JSON", "JSON 格式无效，请检查后重试。") };
  }
}

async function handleGenerate(request, env) {
  if (request.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "此接口只接受 POST 请求。", undefined, { allow: "POST" });
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "请使用 JSON 格式提交。");
  }

  const parsed = await readPayload(request);
  if (parsed.error) return parsed.error;

  const validation = validatePayload(parsed.payload);
  if (validation.fields.length) {
    return errorResponse(422, "INVALID_INPUT", "请检查并补充标记的事故信息。", validation.fields);
  }

  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateLimit = await env.AI_RATE_LIMITER.limit({ key: `${clientIp}:generate` });
  if (!rateLimit.success) {
    return errorResponse(429, "RATE_LIMITED", "生成次数过多，请一分钟后再试。", undefined, { "retry-after": "60" });
  }

  let description;
  try {
    description = await generateDescription(validation.value, env);
  } catch {
    return errorResponse(502, "AI_UPSTREAM_ERROR", "生成服务暂时不可用，请稍后重试。");
  }
  if (!description) {
    return errorResponse(502, "AI_OUTPUT_INVALID", "生成结果格式异常，请稍后重试。");
  }
  return jsonResponse({ description });
}

export default {
  async fetch(request, env) {
    try {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/generate") return await handleGenerate(request, env);
      return errorResponse(404, "NOT_FOUND", "接口不存在。");
    } catch {
      return errorResponse(500, "INTERNAL_ERROR", "服务暂时不可用，请稍后重试。");
    }
  },
};
