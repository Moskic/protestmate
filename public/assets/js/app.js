import { initProtestForm } from "./features/protest-form.js";
import { initProtestGuide } from "./features/protest-guide.js";
import { initStatusChecker } from "./features/status-checker.js";

const byId = (id) => document.getElementById(id);

initProtestForm({
  form: byId("protest-form"),
  submitButton: byId("submit-button"),
  statusError: byId("status-error"),
  resultCard: byId("result-card"),
  resultText: byId("result-text"),
  copyButton: byId("copy-button"),
  skipDetailsButton: byId("skip-details-button"),
});

initStatusChecker({
  openButton: byId("open-status-checker"),
  dialog: byId("status-checker"),
  form: byId("status-checker-form"),
  emailInput: byId("status-email-input"),
  result: byId("status-result"),
  marker: byId("status-result-marker"),
  title: byId("status-result-title"),
  copy: byId("status-result-copy"),
  evidence: byId("status-result-evidence"),
});

initProtestGuide({
  openButton: byId("open-protest-guide"),
  dialog: byId("protest-guide"),
  imageDialog: byId("guide-image-dialog"),
  fullImage: byId("guide-image-full"),
});
