/* Floating "Follow on WhatsApp" button: logo only, gentle pulse. */
(function () {
  try {
    if (document.getElementById("wafl")) return;
    var css = "#wafl{position:fixed;right:16px;bottom:18px;z-index:900;width:56px;height:56px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.28);animation:wafl-bob 2.6s ease-in-out infinite;-webkit-tap-highlight-color:transparent}" +
      "#wafl:before{content:'';position:absolute;inset:0;border-radius:50%;background:#25d366;z-index:-1;animation:wafl-ring 2.6s ease-out infinite}" +
      "#wafl svg{width:32px;height:32px;fill:#fff}" +
      "@keyframes wafl-ring{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(1.7);opacity:0}}" +
      "@keyframes wafl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}" +
      "@media (prefers-reduced-motion:reduce){#wafl,#wafl:before{animation:none}}";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var a = document.createElement("a");
    a.id = "wafl"; a.href = "https://whatsapp.com/channel/0029Vb92PIYEQIasRKfKYR0s";
    a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", "Follow PriceCheck NG on WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 2C6.5 2 2 6.5 2 12.04c0 1.77.46 3.5 1.34 5.02L2 22l5.07-1.33a10 10 0 0 0 4.97 1.27C17.58 21.94 22.08 17.44 22.08 11.9 22.08 6.45 17.58 2 12.04 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.01.79.8-2.93-.2-.31a8.2 8.2 0 1 1 6.89 3.78z"/></svg>';
    document.body.appendChild(a);
  } catch (e) {}
})();
