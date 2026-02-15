/**
 * Static Content Configuration
 * Centralizes all text and data for the website.
 */
const appContent = {
  hero: {
    title: "Interactive Personal Training",
    subtitle: "Experience global workouts from the comfort of your home.",
    ctaPrimary: "Start Free Trial",
    ctaSecondary: "Explore Equipment",
  },
  features: {
    heading: "Train Anywhere",
    subheading: "Access thousands of workouts led by world-class trainers.",
    cards: [
      {
        image: "assets/images/global.jpg",
        badge: "Global",
        title: "Global Workouts",
        description: "Run in London, cycle in the Alps, or row in Antarctica.",
      },
      {
        image: "assets/images/studio.jpg",
        badge: "Studio",
        title: "Studio Classes",
        description: "High-energy studio sessions with motivating instructors.",
      },
      {
        image: "assets/images/yoga.jpg",
        badge: "Wellness",
        title: "Yoga & Mindfulness",
        description: "Strengthen your body and mind with guided sessions.",
      },
    ],
  },
  footer: "&copy; 2023 Fitness Pro. All rights reserved.",
};

document.addEventListener("DOMContentLoaded", () => {
  // Guard clause: Only run if we are on the main page (checking for hero section)
  if (!document.querySelector(".hero-content")) return;

  // 1. Populate Hero Section
  document.querySelector(".hero-content h1").textContent =
    appContent.hero.title;
  document.querySelector(".hero-content p").textContent =
    appContent.hero.subtitle;
  document.querySelector(".hero-content .btn-primary").textContent =
    appContent.hero.ctaPrimary;
  document.querySelector(".hero-content .btn-outline").textContent =
    appContent.hero.ctaSecondary;

  // 2. Populate Features Header
  document.querySelector(".section-header h2").textContent =
    appContent.features.heading;
  document.querySelector(".section-header p").textContent =
    appContent.features.subheading;

  // 3. Generate Feature Cards Dynamically
  const featureGrid = document.querySelector(".feature-grid");
  if (featureGrid) {
    featureGrid.innerHTML = appContent.features.cards
      .map(
        (card) => `
        <div class="card">
            <div class="card-image">
                <img src="${card.image}" alt="${card.title}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#ccc'">
                <div class="card-badge">${card.badge}</div>
            </div>
            <div class="card-body">
                <h3>${card.title}</h3>
                <p>${card.description}</p>
            </div>
        </div>
    `,
      )
      .join("");
  }

  // 4. Populate Footer
  document.querySelector("footer p").innerHTML = appContent.footer;
});
