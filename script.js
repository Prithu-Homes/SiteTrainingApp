document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Video
  if (typeof loadHeroVideo === "function") {
    loadHeroVideo();
  } else {
    console.error(
      "loadHeroVideo function not found. Ensure videos.js is loaded.",
    );
  }

  // 2. Sticky Navbar Logic
  const navbar = document.querySelector(".navbar");
  const navContainer = document.querySelector(".nav-container");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
      navContainer.style.padding = "0.5rem 2rem";
    } else {
      navbar.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
      navContainer.style.padding = "1rem 2rem";
    }
  });

  // 3. Smooth Scrolling
  // Use event delegation to handle dynamically added links from content.js
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    e.preventDefault();
    const targetId = anchor.getAttribute("href");
    if (targetId === "#") return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
      });
    }
  });

  // 4. Mobile Menu Toggle (Simple implementation)
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  // Note: In a real app, you'd toggle a class on a mobile menu container
  if (hamburger && navbar) {
    hamburger.addEventListener("click", () => {
      navbar.classList.toggle("mobile-open");
    });
  }

  if (navLinks && navbar) {
    navLinks.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;
      navbar.classList.remove("mobile-open");
    });
  }

  document.addEventListener("click", (e) => {
    if (!navbar || !navbar.classList.contains("mobile-open")) return;
    if (e.target.closest(".navbar")) return;
    navbar.classList.remove("mobile-open");
  });
});
