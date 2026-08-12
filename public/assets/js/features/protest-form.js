import {
  FIELD_RULES,
  INCIDENT_TYPES,
  OUTCOMES,
  OUTCOME_CONFLICTS,
  SESSION_TYPES,
  validateProtestPayload,
} from "../../shared/protest-schema.js";
import { createFormErrors } from "../ui/errors.js";

const REQUEST_TIMEOUT_MS = 30_000;

function appendOptions(select, options) {
  const placeholder = new Option("请选择", "");
  select.replaceChildren(placeholder, ...options.map(({ value, uiLabel }) => new Option(uiLabel, value)));
}

function configureForm(form) {
  appendOptions(form.elements.incidentType, INCIDENT_TYPES);
  appendOptions(form.elements.sessionType, SESSION_TYPES);

  const checks = form.querySelector(".checks");
  checks.replaceChildren(...OUTCOMES.map(({ value, uiLabel }) => {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "outcomes";
    input.value = value;
    const text = document.createElement("span");
    text.textContent = uiLabel;
    label.append(input, text);
    return label;
  }));

  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    const input = form.elements[field];
    if (!input || field === "outcomes") continue;
    input.required = rule.required;
    if (rule.maxLength) input.maxLength = rule.maxLength;
  }
}

function collectPayload(form) {
  return {
    incidentType: form.elements.incidentType.value,
    protestedDriverName: form.elements.protestedDriverName.value.trim(),
    sessionType: form.elements.sessionType.value,
    lapOrTime: form.elements.lapOrTime.value.trim(),
    trackLocation: form.elements.trackLocation.value.trim(),
    otherCarNumber: form.elements.otherCarNumber.value.trim(),
    observedAction: form.elements.observedAction.value.trim(),
    userAction: form.elements.userAction.value.trim(),
    outcomes: [...form.querySelectorAll("input[name='outcomes']:checked")].map((input) => input.value),
    additionalContext: form.elements.additionalContext.value.trim(),
  };
}

function validationMessage(field, error) {
  if (error.code === "required") return FIELD_RULES[field]?.requiredMessage || "请填写此项。";
  if (error.code === "too_long") return `最多可填写 ${error.maxLength} 个字符。`;
  if (field === "incidentType") return "请选择有效的违规类型。";
  if (field === "sessionType") return "请选择有效的场次类型。";
  if (error.code === "other_requires_context") return "请选择“其他”后，在补充信息中说明具体后果。";
  if (field === "outcomes") return "请选择有效且不冲突的事故后果。";
  return "请检查此项内容。";
}

export function initProtestForm(elements) {
  const { form, submitButton, statusError, resultCard, resultText, copyButton, skipDetailsButton } = elements;
  configureForm(form);
  const formErrors = createFormErrors(form, statusError);

  function resetResult() {
    resultText.textContent = "";
    resultCard.classList.remove("has-result");
    copyButton.disabled = true;
    copyButton.textContent = "复制";
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.textContent = loading ? "正在整理…" : "生成英文描述 →";
  }

  function refreshVisibleFieldError(field) {
    const errorElement = form.querySelector(`#${field}-error`);
    if (!errorElement?.textContent) return;
    const error = validateProtestPayload(collectPayload(form)).errors[field];
    if (error) formErrors.showField(field, validationMessage(field, error));
    else formErrors.clearField(field);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formErrors.clearAll();
    resetResult();

    const payload = collectPayload(form);
    const validation = validateProtestPayload(payload);
    if (validation.fields.length) {
      for (const field of validation.fields) {
        formErrors.showField(field, validationMessage(field, validation.errors[field]));
      }
      form.elements[validation.fields[0]]?.focus();
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.error?.message || "生成失败，请稍后重试。";
        const fields = Array.isArray(body?.error?.fields) ? body.error.fields : [];
        for (const field of fields) {
          const error = validation.errors[field];
          formErrors.showField(field, error ? validationMessage(field, error) : FIELD_RULES[field]?.requiredMessage || message);
        }
        formErrors.showStatus(message);
        if (fields.length) form.elements[fields[0]]?.focus();
        return;
      }
      if (typeof body?.description !== "string" || !body.description.trim()) {
        formErrors.showStatus("生成结果格式异常，请稍后重试。");
        return;
      }

      resultText.textContent = body.description.trim();
      resultCard.classList.add("has-result");
      copyButton.disabled = false;
      resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      formErrors.showStatus(timedOut ? "生成超时，请稍后重试。" : "网络连接失败，请检查连接后重试。");
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  });

  function handleFormEdit(event) {
    resetResult();
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "outcomes" && target.checked) {
      const pair = OUTCOME_CONFLICTS.find((values) => values.includes(target.value));
      const conflictingValue = pair?.find((value) => value !== target.value);
      const conflictingInput = conflictingValue && form.querySelector(`input[name="outcomes"][value="${conflictingValue}"]`);
      if (conflictingInput) conflictingInput.checked = false;
    }

    const field = target.name;
    if (!field) return;
    refreshVisibleFieldError(field);
    if (field === "outcomes") refreshVisibleFieldError("additionalContext");
    if (field === "additionalContext") refreshVisibleFieldError("outcomes");
  }

  form.addEventListener("input", handleFormEdit);
  form.addEventListener("change", handleFormEdit);

  skipDetailsButton.addEventListener("click", () => {
    submitButton.scrollIntoView({ behavior: "smooth", block: "center" });
    submitButton.focus({ preventScroll: true });
  });

  copyButton.addEventListener("click", async () => {
    if (!resultText.textContent) return;
    try {
      await navigator.clipboard.writeText(resultText.textContent);
      copyButton.textContent = "已复制 ✓";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(resultText);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyButton.textContent = "请手动复制";
    }
    window.setTimeout(() => { copyButton.textContent = "复制"; }, 1800);
  });
}

