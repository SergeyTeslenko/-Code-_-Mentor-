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

const telegramQrOpen = document.getElementById("telegramQrOpen");
const telegramQrDialog = document.getElementById("telegramQrDialog");
const telegramQrClose = telegramQrDialog?.querySelector(".qr-dialog-close");

if (telegramQrOpen && telegramQrDialog instanceof HTMLDialogElement && telegramQrClose) {
  telegramQrOpen.addEventListener("click", () => telegramQrDialog.showModal());
  telegramQrClose.addEventListener("click", () => telegramQrDialog.close());
  telegramQrDialog.addEventListener("click", (event) => {
    if (event.target === telegramQrDialog) telegramQrDialog.close();
  });
}

/* Форма записи — есть только на главной странице */
const signupForm = document.getElementById("form");

if (signupForm) {
  const signupStatus = document.getElementById("signupStatus");
  const submitButton = signupForm.querySelector('button[type="submit"]');
  const submitButtonLabel = submitButton?.innerHTML;
  let hasSubmitted = false;

  const restoreSubmitButton = () => {
    if (!hasSubmitted || !submitButton || !submitButtonLabel) return;

    hasSubmitted = false;
    submitButton.disabled = false;
    submitButton.innerHTML = submitButtonLabel;
    submitButton.classList.remove("is-success");
  };

  signupForm.addEventListener("input", restoreSubmitButton);
  signupForm.addEventListener("change", restoreSubmitButton);

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const endpoint = signupForm.dataset.endpoint.trim();

    if (!endpoint) {
      signupStatus.textContent =
        "Форма пока не подключена. Пожалуйста, свяжитесь со мной через контакты на сайте.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";
    signupStatus.textContent = "Отправляем заявку…";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(signupForm))),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("Сервер вернул некорректный ответ.");
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Не удалось отправить заявку.");
      }

      signupForm.reset();
      hasSubmitted = true;
      submitButton.innerHTML = "Заявка отправлена <b>✓</b>";
      submitButton.classList.add("is-success");
      signupStatus.textContent = "Спасибо! Заявка отправлена, скоро с вами свяжутся.";
    } catch (error) {
      console.error("Signup submission failed:", error);
      submitButton.innerHTML = submitButtonLabel;
      signupStatus.textContent =
        error instanceof TypeError
          ? "Нет связи с сервером. Проверьте интернет и совпадение SITE_ORIGIN в Cloudflare с адресом сайта."
          : `Заявка не отправлена: ${error.message}`;
    } finally {
      submitButton.disabled = hasSubmitted;
    }
  });
}

/* Виджет чата — есть на главной и странице Python */
const supportWidget = document.getElementById("supportWidget");
const supportChatForm = document.getElementById("supportChatForm");

if (supportWidget && supportChatForm) {
  const supportChatInput = document.getElementById("supportChatInput");
  const supportThread = document.getElementById("supportThread");
  const supportChatStatus = document.getElementById("supportChatStatus");
  const supportChatTab = document.getElementById("supportChatTab");
  const supportToggle = document.getElementById("supportToggle");
  const supportCornerToggle = document.getElementById("supportCornerToggle");
  const supportClose = document.getElementById("supportClose");
  const pageFooter = document.querySelector("footer");
  const sendButton = supportChatForm.querySelector('button[type="submit"]');
  const endpoint = supportWidget.dataset.endpoint?.trim();
  const sessionKey = "code-mentor-support-session";
  const cursorKey = "code-mentor-support-cursor";
  let sessionId;
  let replyCursor = 0;
  let pollTimer;
  let pollInFlight = false;

  const setChatStatus = (message, state = "") => {
    supportChatStatus.textContent = message;
    supportChatStatus.classList.remove("is-pending", "is-success", "is-error");
    if (state) supportChatStatus.classList.add(`is-${state}`);
  };

  const createSessionId = () => {
    if (crypto.randomUUID) return crypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  try {
    sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId || !/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(sessionId)) {
      sessionId = createSessionId();
      sessionStorage.setItem(sessionKey, sessionId);
      sessionStorage.removeItem(cursorKey);
    }

    const savedCursor = Number(sessionStorage.getItem(cursorKey) || 0);
    if (Number.isSafeInteger(savedCursor) && savedCursor >= 0) replyCursor = savedCursor;
  } catch (error) {
    console.warn("Could not persist support chat session:", error);
    sessionId = createSessionId();
  }

  const addChatMessage = (text, sender, timeLabel) => {
    const message = document.createElement("div");
    message.className = `support-message support-message-${sender}`;

    if (sender === "mentor") {
      const avatar = document.createElement("span");
      avatar.className = "support-message-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "</>";
      message.append(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "support-message-bubble";
    const content = document.createElement("div");
    content.className = "support-message-content";
    content.textContent = text;
    const time = document.createElement("time");
    time.className = "support-message-time";
    time.textContent = timeLabel || new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    bubble.append(content, time);
    message.append(bubble);
    supportThread.append(message);
    supportThread.scrollTop = supportThread.scrollHeight;
  };

  const saveReplyCursor = () => {
    try {
      sessionStorage.setItem(cursorKey, String(replyCursor));
    } catch (error) {
      console.warn("Could not persist support chat reply cursor:", error);
    }
  };

  const requestSupport = async (payload) => {
    if (!endpoint) throw new Error("Чат пока не подключён. Пожалуйста, свяжитесь через контакты на сайте.");

    const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, sessionId }),
    });

    if (response.status === 404) {
      throw new Error("На Worker не опубликован маршрут чата. Обновите Worker файлом telegram-worker.js.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Сервер вернул некорректный ответ.");
    }

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Не удалось связаться с поддержкой.");
    }
    return result;
  };

  const pollReplies = async () => {
    if (pollInFlight || !endpoint) return;
    pollInFlight = true;

    try {
      const result = await requestSupport({ action: "poll", after: replyCursor });
      if (!Array.isArray(result.replies)) throw new Error("Сервер вернул некорректный список ответов.");

      for (const reply of result.replies) {
        if (!Number.isSafeInteger(reply.id) || reply.id <= replyCursor || typeof reply.text !== "string") {
          throw new Error("Сервер вернул некорректный ответ поддержки.");
        }
        addChatMessage(reply.text, "mentor");
        replyCursor = reply.id;
      }

      if (result.replies.length) saveReplyCursor();
      if (supportChatStatus.textContent === "Подключаем чат…") setChatStatus("");
    } catch (error) {
      setChatStatus(
        error instanceof TypeError
          ? "Нет связи с чатом. Проверьте подключение и адрес сайта в настройках."
          : error.message,
        "error",
      );
      console.warn("Support chat polling failed:", error);
    } finally {
      pollInFlight = false;
    }
  };

  const updatePolling = () => {
    const isChatVisible =
      supportWidget.classList.contains("open") &&
      supportChatTab?.getAttribute("aria-selected") === "true";

    if (isChatVisible && !pollTimer) {
      if (!endpoint) {
        setChatStatus("Чат пока не подключён. Пожалуйста, свяжитесь через контакты на сайте.", "error");
        return;
      }
      setChatStatus("Подключаем чат…", "pending");
      pollReplies();
      pollTimer = window.setInterval(pollReplies, 4000);
    } else if (!isChatVisible && pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };

  if (supportCornerToggle && pageFooter) {
    let footerPositionFrame = 0;
    const updateCornerPosition = () => {
      footerPositionFrame = 0;
      const footerRect = pageFooter.getBoundingClientRect();
      const toggleHeight = supportCornerToggle.offsetHeight;
      const margin = 16;
      const footerVisible = footerRect.top < window.innerHeight && footerRect.bottom > 0;

      if (!footerVisible) {
        supportCornerToggle.style.removeProperty("--support-corner-bottom");
        supportCornerToggle.classList.remove("is-over-footer");
        supportWidget.querySelector(".support-panel")?.style.removeProperty("--support-panel-bottom");
        return;
      }

      if (footerRect.top <= toggleHeight + margin) {
        supportCornerToggle.classList.add("is-over-footer");
        return;
      }

      const bottom = Math.max(20, window.innerHeight - footerRect.top + margin);
      supportCornerToggle.style.setProperty("--support-corner-bottom", `${bottom}px`);
      supportCornerToggle.classList.remove("is-over-footer");
      supportWidget.querySelector(".support-panel")?.style.setProperty("--support-panel-bottom", `${bottom + toggleHeight + 12}px`);
    };
    const scheduleCornerPosition = () => {
      if (!footerPositionFrame) footerPositionFrame = window.requestAnimationFrame(updateCornerPosition);
    };

    window.addEventListener("scroll", scheduleCornerPosition, { passive: true });
    window.addEventListener("resize", scheduleCornerPosition);
    updateCornerPosition();
  }

  supportChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = supportChatInput.value.trim();
    if (!text || sendButton.disabled) return;

    sendButton.disabled = true;
    setChatStatus("Отправляем сообщение…", "pending");

    try {
      await requestSupport({ action: "message", text });
      addChatMessage(text, "visitor");
      supportChatInput.value = "";
      setChatStatus("Сообщение отправлено. Ответ появится здесь.", "success");
    } catch (error) {
      setChatStatus(
        error instanceof TypeError
          ? "Нет связи с чатом. Проверьте подключение и адрес сайта в настройках."
          : error.message,
        "error",
      );
      console.error("Support chat message failed:", error);
    } finally {
      sendButton.disabled = false;
      supportChatInput.focus();
    }
  });

  supportChatTab?.addEventListener("click", () => window.setTimeout(updatePolling, 0));
  supportToggle?.addEventListener("click", () => window.setTimeout(updatePolling, 0));
  supportCornerToggle?.addEventListener("click", () => window.setTimeout(updatePolling, 0));
  supportClose?.addEventListener("click", () => window.setTimeout(updatePolling, 0));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") window.setTimeout(updatePolling, 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    } else {
      updatePolling();
    }
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
