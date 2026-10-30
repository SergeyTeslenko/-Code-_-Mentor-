const header = document.querySelector(".header");

if (header) {
  const setHeaderState = () => {
    header.classList.toggle("scrolled", window.scrollY > 18);
  };

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
}

/* Course cards reveal one course at a time on the landing page */
const courseLinks = document.querySelectorAll("[data-course-toggle]");
const coursePanels = document.querySelectorAll(".course-content");

function showCoursePanel(panel, sourceLink) {
  coursePanels.forEach((coursePanel) => {
    coursePanel.hidden = coursePanel !== panel;
  });
  courseLinks.forEach((courseLink) => {
    courseLink.setAttribute("aria-expanded", String(courseLink === sourceLink));
    courseLink.textContent =
      courseLink === sourceLink ? "Скрыть программу ↑" : "Смотреть программу →";
  });
}

courseLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const panelId = link.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;

    if (!panel) {
      console.error(`Course content panel not found: ${panelId}`);
      return;
    }

    if (panel.hidden) {
      showCoursePanel(panel, link);
      history.replaceState(null, "", `#${panel.id}`);
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      showCoursePanel(null, null);
      history.replaceState(null, "", "#courses");
      requestAnimationFrame(() =>
        document.getElementById("courses")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  });
});

document.querySelectorAll('.course-content a[href="#courses"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showCoursePanel(null, null);
    history.replaceState(null, "", "#courses");
    requestAnimationFrame(() =>
      document.getElementById("courses")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  });
});

const initialCoursePanel = document.getElementById(window.location.hash.slice(1));
if (initialCoursePanel?.matches(".course-content")) {
  const initialLink = document.querySelector(`[aria-controls="${initialCoursePanel.id}"]`);
  showCoursePanel(initialCoursePanel, initialLink);
  requestAnimationFrame(() => initialCoursePanel.scrollIntoView({ block: "start" }));
}

const pricingCarousel = document.getElementById("pricingCarousel");

if (pricingCarousel) {
  const pricingButtons = document.querySelectorAll("[data-pricing-direction]");
  const pricingCards = pricingCarousel.querySelectorAll(".price-card");

  const updatePricingButtons = () => {
    pricingButtons.forEach((button) => {
      const direction = Number(button.getAttribute("data-pricing-direction"));
      button.disabled =
        direction < 0
          ? pricingCarousel.scrollLeft <= 1
          : pricingCarousel.scrollLeft + pricingCarousel.clientWidth >=
            pricingCarousel.scrollWidth - 1;
    });
  };

  pricingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const firstCard = pricingCards[0];
      if (!firstCard) return;

      const gap = Number.parseFloat(getComputedStyle(pricingCarousel).columnGap) || 0;
      const direction = Number(button.getAttribute("data-pricing-direction"));
      pricingCarousel.scrollBy({
        left: direction * (firstCard.getBoundingClientRect().width + gap),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  });

  pricingCarousel.addEventListener("scroll", updatePricingButtons, { passive: true });
  window.addEventListener("resize", updatePricingButtons);
  updatePricingButtons();
}

/* Калькулятор стоимости — есть только на главной странице */
const format = document.getElementById("format");
const lessons = document.getElementById("lessons");
const lessonOut = document.getElementById("lessonOut");
const total = document.getElementById("total");

function calculate() {
  const count = Number(lessons.value);
  const price = Number(format.value);
  const min = Number(lessons.min);
  const max = Number(lessons.max);
  const percent = ((count - min) / (max - min)) * 100;

  lessons.style.setProperty("--percent", `${percent}%`);
  lessonOut.textContent = `${count} ${count === 1 ? "занятие" : count < 5 ? "занятия" : "занятий"}`;
  total.textContent = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "BYN",
  }).format(count * price);
}

if (format && lessons && lessonOut && total) {
  format.addEventListener("change", calculate);
  lessons.addEventListener("input", calculate);
  calculate();
}

/* Форма записи — есть только на главной странице */
const signupForm = document.getElementById("form");

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = e.currentTarget.elements.name.value.trim();
    alert(
      `Спасибо, ${name || "родитель"}! Заявка заполнена. Подключите обработчик формы, чтобы отправлять её в Telegram/CRM.`,
    );
    e.currentTarget.reset();
  });
}

/* Окно контактов — есть на всех страницах */
const contactToggle = document.querySelector(".contact-toggle");
const contactPanel = document.getElementById("contactPanel");
const contactClose = document.querySelector(".contact-close");

if (contactToggle && contactPanel && contactClose) {
  const setContactPanel = (open) => {
    contactPanel.hidden = !open;
    contactToggle.setAttribute("aria-expanded", String(open));
  };

  contactToggle.addEventListener("click", () =>
    setContactPanel(contactPanel.hidden),
  );

  contactClose.addEventListener("click", () => setContactPanel(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setContactPanel(false);
  });
}
