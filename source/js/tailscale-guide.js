document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tailscale-guide .copy-code").forEach((button) => {
    button.hidden = false;
    button.setAttribute("aria-live", "polite");
    button.addEventListener("click", async () => {
      const code = button.closest(".code-block")?.querySelector("code");
      if (!code) return;
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = "已复制";
      } catch (_) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = "已选中，请手动复制";
      }
      window.setTimeout(() => { button.textContent = "复制代码"; }, 2400);
    });
  });
});
