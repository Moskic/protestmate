import { connectDialog } from "../ui/dialog.js";

export function initProtestGuide({ openButton, dialog, imageDialog, fullImage }) {
  connectDialog({ dialog, openButton, closeSelector: "[data-close-guide]" });

  for (const imageButton of dialog.querySelectorAll("[data-guide-image]")) {
    imageButton.addEventListener("click", () => {
      fullImage.src = imageButton.dataset.guideImage;
      fullImage.alt = imageButton.dataset.guideAlt;
      imageDialog.showModal();
    });
  }

  imageDialog.querySelector("[data-close-image]").addEventListener("click", () => imageDialog.close());
  imageDialog.addEventListener("click", (event) => {
    if (event.target === imageDialog) imageDialog.close();
  });
  imageDialog.addEventListener("close", () => {
    fullImage.removeAttribute("src");
    fullImage.alt = "";
  });
}

