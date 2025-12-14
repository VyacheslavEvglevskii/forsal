window.addEventListener("load", () => {
  setTimeout(() => {
    const screen = document.getElementById("loadingScreen");
    if (screen) {
      screen.style.opacity = "0";
      screen.style.transition = "opacity 0.5s ease";
      setTimeout(() => screen.remove(), 500);
    }
  }, 5000);
});


