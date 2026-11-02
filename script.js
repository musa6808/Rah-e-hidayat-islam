
let tasbihCount = 0;
let userLat = null;
let userLon = null;
let countdownInterval = null;

const names = {
  ur: ["فجر", "ظہر", "عصر", "مغرب", "عشاء"],
  ar: ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"],
  en: ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"],
  hi: ["फ़ज्र", "ज़ुहर", "अस्र", "मग़रिब", "इशा"]
};

const languages = {
  ur: {
    brand: "راہِ ہدایت",
    welcome: "اپنی زندگی کو نماز کے نور سے روشن کریں",
    intro: "قرآن، نماز، قبلہ اور اذکار سب ایک جگہ۔",
    prayerTitle: "نماز کے اوقات"
  },
  ar: {
    brand: "طريق الهداية",
    welcome: "أنر حياتك بنور الصلاة",
    intro: "القرآن والصلاة والقبلة والأذكار في مكان واحد.",
    prayerTitle: "أوقات الصلاة"
  },
  en: {
    brand: "Rah-e-Hidayat",
    welcome: "Bring the light of prayer into your life",
    intro: "Quran, prayer, Qibla and remembrance in one place.",
    prayerTitle: "Prayer Times"
  },
  hi: {
    brand: "राह-ए-हिदायत",
    welcome: "अपनी ज़िंदगी को नमाज़ के नूर से रोशन करें",
    intro: "क़ुरआन, नमाज़, क़िबला और अज़कार एक जगह।",
    prayerTitle: "नमाज़ के समय"
  }
};

let currentLanguage = "ur";

document.getElementById("language").addEventListener("change", function () {
  currentLanguage = this.value;

  document.documentElement.lang = currentLanguage;
  document.documentElement.dir =
    currentLanguage === "ur" || currentLanguage === "ar"
      ? "rtl" : "ltr";

  document.querySelectorAll("[data-key]").forEach(function (element) {
    const key = element.dataset.key;
    element.textContent = languages[currentLanguage][key];
  });

  if (window.savedTimings) {
    showPrayerTimes(window.savedTimings);
  }
});

document.getElementById("theme").addEventListener("click", function () {
  document.body.classList.toggle("dark");
  this.textContent =
    document.body.classList.contains("dark") ? "☀" : "☾";
});

function openPanel(name) {
  closePanels();
  document.getElementById(name).classList.remove("hidden");
  document.getElementById(name).scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function closePanels() {
  document.querySelectorAll(".panel").forEach(function (panel) {
    panel.classList.add("hidden");
  });
}

function increase() {
  tasbihCount++;
  document.getElementById("count").textContent = tasbihCount;
}

function resetCount() {
  tasbihCount = 0;
  document.getElementById("count").textContent = "0";
}

document.getElementById("location").addEventListener("click", getLocation);

function getLocation() {
  const status = document.getElementById("status");

  if (!navigator.geolocation) {
    status.textContent = "Your browser does not support location.";
    return;
  }

  status.textContent = "Getting your location...";

  navigator.geolocation.getCurrentPosition(
    function (position) {
      userLat = position.coords.latitude;
      userLon = position.coords.longitude;

      loadPrayerTimes();
      calculateQibla();
    },
    function () {
      status.textContent =
        "Location permission denied. Please allow location access.";
    },
    {
      enableHighAccuracy: true,
      timeout: 15000
    }
  );
}

async function loadPrayerTimes() {
  const status = document.getElementById("status");

  try {
    status.textContent = "Loading prayer times...";

    const url =
      `https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}` +
      `?latitude=${userLat}&longitude=${userLon}&method=3`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.code !== 200) {
      throw new Error("Prayer times unavailable");
    }

    window.savedTimings = result.data;
    showPrayerTimes(result.data);

    document.getElementById("hijri").textContent =
      result.data.date.hijri.day + " " +
      result.data.date.hijri.month.en + " " +
      result.data.date.hijri.year;

    document.getElementById("status").textContent =
      "Location detected successfully.";

    document.getElementById("city").textContent =
      result.data.meta.timezone || "Your location";

    document.getElementById("date").textContent =
      result.data.date.readable;

  } catch (error) {
    status.textContent =
      "Could not load prayer times. Please try again.";
  }
}

function showPrayerTimes(data) {
  const timings = data.timings;
  const keys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const icons = ["🌅", "☀️", "🌤️", "🌇", "🌙"];

  const container = document.getElementById("prayers");
  container.innerHTML = "";

  const now = new Date();
  let nextPrayer = null;
  let nextTime = null;

  keys.forEach(function (key, index) {
    const time = timings[key].split(" ")[0];
    const parts = time.split(":").map(Number);

    const prayerDate = new Date();
    prayerDate.setHours(parts[0], parts[1], 0, 0);

    if (!nextPrayer && prayerDate > now) {
      nextPrayer = key;
      nextTime = prayerDate;
    }

    const item = document.createElement("div");

    item.innerHTML = `
      ${icons[index]}
      <p>${names[currentLanguage][index]}</p>
      <b>${time}</b>
    `;

    container.appendChild(item);
  });

  if (!nextPrayer) {
    nextPrayer = "Fajr";
    const parts = timings.Fajr.split(" ")[0].split(":").map(Number);
    nextTime = new Date();
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(parts[0], parts[1], 0, 0);
  }

  const index = keys.indexOf(nextPrayer);

  document.getElementById("nextPrayer").textContent =
    names[currentLanguage][index];

  document.getElementById("nextHint").textContent =
    timings[nextPrayer].split(" ")[0];

  startCountdown(nextTime);
}

function startCountdown(target) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  function update() {
    const difference = Math.max(0, target - new Date());

    const hours = String(
      Math.floor(difference / 3600000)
    ).padStart(2, "0");

    const minutes = String(
      Math.floor((difference % 3600000) / 60000)
    ).padStart(2, "0");

    const seconds = String(
      Math.floor((difference % 60000) / 1000)
    ).padStart(2, "0");

    document.getElementById("countdown").textContent =
      `${hours}:${minutes}:${seconds}`;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

function calculateQibla() {
  const kaabaLat = 21.4225 * Math.PI / 180;
  const kaabaLon = 39.8262 * Math.PI / 180;

  const lat = userLat * Math.PI / 180;
  const lon = userLon * Math.PI / 180;

  const y = Math.sin(kaabaLon - lon);

  const x =
    Math.cos(lat) * Math.tan(kaabaLat) -
    Math.sin(lat) * Math.cos(kaabaLon - lon);

  const bearing =
    (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  document.getElementById("degrees").textContent =
    Math.round(bearing) + "°";
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("date").textContent =
    new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());
});
