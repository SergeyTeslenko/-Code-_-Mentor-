const header = document.querySelector(".header");

if (header) {
  const setHeaderState = () => {
    header.classList.toggle("scrolled", window.scrollY > 18);
  };

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
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
  total.textContent =
    new Intl.NumberFormat("ru-RU").format(count * price) + " ₽";
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
