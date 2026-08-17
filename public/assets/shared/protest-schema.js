export const INCIDENT_TYPES = Object.freeze([
  { value: "intentional_wrecking", uiLabel: "故意、报复性或恶意撞击" },
  { value: "blocking", uiLabel: "阻挡" },
  { value: "unsafe_rejoin", uiLabel: "危险重返赛道" },
  { value: "reckless_erratic", uiLabel: "鲁莽或异常驾驶" },
  { value: "other_on_track", uiLabel: "其他赛道违规行为" },
]);

export const SESSION_TYPES = Object.freeze([
  { value: "race", uiLabel: "正赛", aiLabel: "Race" },
  { value: "qualifying", uiLabel: "排位", aiLabel: "Qualifying" },
  { value: "practice", uiLabel: "练习", aiLabel: "Practice" },
]);

export const OUTCOMES = Object.freeze([
  { value: "avoided_contact", uiLabel: "成功避让，无接触", aiLabel: "Avoided contact" },
  { value: "contact", uiLabel: "发生接触", aiLabel: "Contact" },
  { value: "spin", uiLabel: "失控或打转", aiLabel: "Loss of control or spin" },
  { value: "off_track", uiLabel: "冲出赛道", aiLabel: "Went off track" },
  { value: "time_lost", uiLabel: "明显减速或损失时间", aiLabel: "Significant time lost" },
  { value: "damage", uiLabel: "车辆受损", aiLabel: "Vehicle damage" },
  { value: "pit_or_tow", uiLabel: "被迫进站或拖车维修", aiLabel: "Required a pit stop or tow for repairs" },
  { value: "positions_lost", uiLabel: "损失名次", aiLabel: "Positions lost" },
  { value: "retired", uiLabel: "退赛", aiLabel: "Retirement" },
  { value: "other", uiLabel: "其他", aiLabel: "Other consequence described in the additional context" },
]);

export const FIELD_RULES = Object.freeze({
  incidentType: { required: true, requiredMessage: "请选择违规类型。" },
  protestedDriverName: { required: true, maxLength: 100, requiredMessage: "请填写被投诉车手的名称。" },
  sessionType: { required: false },
  lapOrTime: { required: false, maxLength: 80 },
  trackLocation: { required: false, maxLength: 120 },
  otherCarNumber: { required: false, maxLength: 32 },
  observedAction: { required: true, maxLength: 1000, requiredMessage: "请简单描述事件经过。" },
  userAction: { required: false, maxLength: 800 },
  outcomes: { required: false },
  additionalContext: { required: false, maxLength: 1200 },
});

export const OUTCOME_CONFLICTS = Object.freeze([["avoided_contact", "contact"]]);

const incidentValues = new Set(INCIDENT_TYPES.map(({ value }) => value));
const sessionValues = new Set(SESSION_TYPES.map(({ value }) => value));
const outcomeValues = new Set(OUTCOMES.map(({ value }) => value));
const stringFields = Object.entries(FIELD_RULES)
  .filter(([field]) => !["incidentType", "sessionType", "outcomes"].includes(field));

function emptyValue() {
  return {
    incidentType: "",
    protestedDriverName: "",
    sessionType: "",
    lapOrTime: "",
    trackLocation: "",
    otherCarNumber: "",
    observedAction: "",
    userAction: "",
    outcomes: [],
    additionalContext: "",
  };
}

function conflicts(values) {
  return OUTCOME_CONFLICTS.some((pair) => pair.every((value) => values.includes(value)));
}

export function validateProtestPayload(payload) {
  const value = emptyValue();
  const errors = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    for (const [field, rule] of Object.entries(FIELD_RULES)) {
      if (rule.required) errors[field] = { code: "required" };
    }
    return { fields: Object.keys(errors), errors, value };
  }

  if (typeof payload.incidentType !== "string" || !incidentValues.has(payload.incidentType)) {
    errors.incidentType = { code: payload.incidentType ? "invalid_choice" : "required" };
  } else {
    value.incidentType = payload.incidentType;
  }

  if (payload.sessionType === undefined || payload.sessionType === null || payload.sessionType === "") {
    value.sessionType = "";
  } else if (typeof payload.sessionType !== "string" || !sessionValues.has(payload.sessionType)) {
    errors.sessionType = { code: "invalid_choice" };
  } else {
    value.sessionType = payload.sessionType;
  }

  for (const [field, rule] of stringFields) {
    const raw = payload[field];
    if (raw === undefined || raw === null) {
      if (rule.required) errors[field] = { code: "required" };
      continue;
    }
    if (typeof raw !== "string") {
      errors[field] = { code: "invalid_type" };
      continue;
    }

    const normalized = raw.trim();
    value[field] = normalized;
    if (rule.required && !normalized) {
      errors[field] = { code: "required" };
    } else if (rule.maxLength && normalized.length > rule.maxLength) {
      errors[field] = { code: "too_long", maxLength: rule.maxLength };
    }
  }

  const outcomes = payload.outcomes;
  if (outcomes === undefined || outcomes === null) {
    value.outcomes = [];
  } else if (
    !Array.isArray(outcomes) ||
    outcomes.length > OUTCOMES.length ||
    outcomes.some((item) => typeof item !== "string" || !outcomeValues.has(item)) ||
    new Set(outcomes).size !== outcomes.length ||
    conflicts(outcomes)
  ) {
    errors.outcomes = { code: "invalid_outcomes" };
  } else {
    value.outcomes = outcomes;
  }

  if (value.outcomes.includes("other") && !value.additionalContext) {
    errors.additionalContext = { code: "other_requires_context" };
  }

  return { fields: Object.keys(errors), errors, value };
}
