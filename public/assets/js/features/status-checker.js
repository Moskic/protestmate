import { connectDialog } from "../ui/dialog.js";

const protestStatuses = {
  pending: {
    marker: "…",
    title: "已受理 · 审核中",
    copy: "iRacing 已收到你的申诉，审核人员正在进行审核。审核完成后，你还会收到一封结案邮件。",
    evidence: "邮件表示申诉已收到，且 iRacing 审核人员将进行审核。",
  },
  "not-intentional": {
    marker: "–",
    title: "已结案 · 未认定故意或恶意",
    copy: "iRacing 审核人员认为这次事故并非故意或恶意造成。事件仍会被记录，对方车手也可能收到指导或被持续观察。",
    evidence: "邮件表示事故不被认为是故意或恶意造成。",
  },
  resolved: {
    marker: "✓",
    title: "已结案 · 具体结果保密",
    copy: "审核已经完成，对方车手已收到处理结果。iRacing 不会向申诉提交者披露是否以及如何处罚。",
    evidence: "邮件表示审核已完成、对方已获知结果，且具体结果保密。",
  },
  unknown: {
    marker: "?",
    title: "暂时无法确认",
    copy: "没有匹配到目前支持的 iRacing 回复模板。请确认已粘贴邮件主题和完整正文。",
    evidence: "系统不会在依据不足时推测处理结果。",
  },
};

export function normalizeEmailContent(content) {
  return content
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyProtestStatus(content) {
  const normalized = normalizeEmailContent(content);
  const isNotIntentional = [
    "do not feel that the accident was caused intentionally or with malice",
    "do not believe that the accident was caused intentionally or with malice",
    "do not feel the accident was caused intentionally or with malice",
  ].some((phrase) => normalized.includes(phrase));
  if (isNotIntentional) return "not-intentional";

  if (
    normalized.includes("resolved protest against") ||
    normalized.includes("we have reviewed your protest and notified the member being protested of the outcome") ||
    normalized.includes("the outcome of every protest is kept confidential")
  ) return "resolved";

  if (
    normalized.includes("received protest against") ||
    normalized.includes("the protest has been received") ||
    normalized.includes("the stewards will be reviewing this information")
  ) return "pending";

  return "unknown";
}

export function initStatusChecker(elements) {
  const { openButton, dialog, form, emailInput, result, marker, title, copy, evidence } = elements;
  connectDialog({
    dialog,
    openButton,
    closeSelector: "[data-close-status]",
    initialFocus: emailInput,
  });

  function showStatus(status) {
    const content = protestStatuses[status];
    result.dataset.status = status;
    marker.textContent = content.marker;
    title.textContent = content.title;
    copy.textContent = content.copy;
    evidence.textContent = content.evidence;
    result.classList.add("visible");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const emailContent = emailInput.value.trim();
    if (!emailContent) return emailInput.focus();
    showStatus(classifyProtestStatus(emailContent));
  });

  emailInput.addEventListener("input", () => {
    result.classList.remove("visible");
    result.removeAttribute("data-status");
  });
}

