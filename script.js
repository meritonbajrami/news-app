const API_KEY = "pub_49120aaeece6b88f8edd55376c22095afa93f";
const BASE_URL = `https://newsdata.io/api/1/news?apikey=${API_KEY}`;
let locale = localStorage.getItem("selectedLanguage") || "en";

const translations = {
  en: {
    news: "Latest News",
    search: "Search articles...",
    "no-articles": "No articles found.",
  },
  sq: {
    news: "Lajmet e fundit",
    search: "Kërko artikuj...",
    "no-articles": "Nuk u gjetën artikuj.",
  },
};

const buildURL = (params) => {
  const url = new URL(BASE_URL);
  const validParams = {};

  Object.entries(params).forEach(([param, value]) => {
    if (value) {
      validParams[param] = value;
    }
  });

  url.search = new URLSearchParams({
    apikey: API_KEY,
    language: locale,
    ...validParams,
  });

  return url;
};

const getHTTPResponse = async (response) => {
  if (!response.ok) {
    throw new Error("Error fetching data");
  }

  return await response.json();
};

const httpClient = {
  get: async (params) => {
    const result = await fetch(buildURL(params));

    return getHTTPResponse(result);
  },
};

(function () {
  let articles = [];
  let debounceTimeOut;
  let currentQuery = "";

  const pagination = {
    currentPage: 1,
    totalPages: 0,
    nextPage: null,
  };

  const {
    paginationContainerEl,
    articlesSectionEl,
    newsTitleContainerEl,
    searchInputsEl,
    languageEl,
    noDataEl,
    loadingContainerEl,
  } = {
    paginationContainerEl: document.querySelector(".pagination"),
    articlesSectionEl: document.querySelector(".articles-section"),
    newsTitleContainerEl: document.querySelector(".news-title"),
    searchInputsEl: document.querySelectorAll(".search-input"),
    languageEl: document.querySelector(".language-dropdown"),
    noDataEl: document.querySelector(".no-data-message"),
    loadingContainerEl: document.querySelector(".loading"),
  };

  function toggleLoadingState(showLoading) {
    if (showLoading) {
      articlesSectionEl.innerHTML = "";
      paginationContainerEl.innerHTML = "";
    }

    loadingContainerEl.style.display = showLoading ? "flex" : "none";
  }

  async function fetchArticles(rest = {}) {
    try {
      toggleLoadingState(true);

      const { results, totalResults, nextPage } = await httpClient.get(rest);
      pagination.nextPage = nextPage;

      articles = results;
      pagination.totalPages = Math.ceil(totalResults / articles.length);

      renderArticles(articles);
    } finally {
      toggleLoadingState(false);
    }
  }

  function renderArticles(articles) {
    articlesSectionEl.innerHTML = "";

    if (!articles.length) {
      noDataEl.style.display = "flex";
      paginationContainerEl.innerHTML = "";
      return;
    }

    noDataEl.style.display = "none";

    const fragment = document.createDocumentFragment();

    articles.forEach((article) => {
      const articleCard = document.createElement("article");
      articleCard.className = "article-card";
      articleCard.innerHTML = buildArticleCard(article);
      fragment.appendChild(articleCard);
    });
    articlesSectionEl.appendChild(fragment);
    renderPagination();
  }

  function buildArticleCard({ image_url, title, description, pubDate }) {
    const publishedDate = new Date(pubDate).toLocaleDateString("en-GB");

    return `
        <img
          class="article-image"
          src=${image_url}
          alt="Article Image"
          onerror="this.onerror=null;this.src='https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg';"
        />
        <div class="article-content">
          <h2 class="article-title">${title}</h2>
          <p class="article-description">${description}</p>
          <time datetime="${pubDate}">${publishedDate}</time>
        </div>
      `;
  }

  function renderPagination() {
    paginationContainerEl.innerHTML = "";

    if (pagination.totalPages <= 1) return;

    const fragment = document.createDocumentFragment();

    const startPage = Math.max(pagination.currentPage - 2, 1);
    const endPage = Math.min(pagination.currentPage + 2, pagination.totalPages);
    if (pagination.currentPage > 1) {
      const prevButton = document.createElement("button");
      prevButton.innerHTML = "Previous";
      prevButton.className = "pagination-button";
      prevButton.addEventListener("click", () =>
        onPaginationClickHandler(pagination.currentPage - 1)
      );
      fragment.appendChild(prevButton);
    }

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const pageButton = document.createElement("button");
      pageButton.innerHTML = pageNum;
      pageButton.className = "pagination-button";

      if (pageNum === pagination.currentPage) {
        pageButton.style.color = "red";
      }
      pageButton.addEventListener("click", () =>
        onPaginationClickHandler(pageNum)
      );
      fragment.appendChild(pageButton);
    }

    if (pagination.currentPage < pagination.totalPages) {
      const nextButton = document.createElement("button");
      nextButton.innerHTML = "Next";
      nextButton.className = "pagination-button";
      nextButton.addEventListener("click", () =>
        onPaginationClickHandler(pagination.currentPage + 1)
      );
      fragment.appendChild(nextButton);
    }

    paginationContainerEl.appendChild(fragment);
  }

  function onPaginationClickHandler(pageNum) {
    pagination.currentPage = pageNum;
    fetchArticles({ page: pagination.nextPage, q: currentQuery });
  }

  function onSearchHandler(keyword) {
    clearTimeout(debounceTimeOut);

    debounceTimeOut = setTimeout(() => {
      currentQuery = keyword;
      pagination.currentPage = 1;
      fetchArticles({ q: keyword });
    }, 300);
  }

  function onLanguageSwitchHandler(lang) {
    locale = lang;
    localStorage.setItem("selectedLanguage", lang);
    updateTranslations(lang);
    fetchArticles({ language: lang, q: currentQuery });
  }

  function updateTranslations(lang) {
    languageEl.value = lang;

    const translationElements = [
      ...document.querySelectorAll("[data-translate]"),
      ...document.querySelectorAll("[data-translate-placeholder]"),
    ];

    translationElements.forEach((el) => {
      const key =
        el.getAttribute("data-translate") ||
        el.getAttribute("data-translate-placeholder");

      if (translations[lang][key]) {
        el.setAttribute("placeholder", translations[lang][key]);
        el.textContent = translations[lang][key];
      }
    });
  }

  function changeText(e) {
    const anchorTag = e.target;
    if (anchorTag.tagName === "A" && anchorTag.innerText === "Sogody") {
      anchorTag.innerText = "loading...";
    }
  }

  function init() {
    document.addEventListener("DOMContentLoaded", () => {
      updateTranslations(locale);
      fetchArticles();

      newsTitleContainerEl.addEventListener("click", (e) => {
        changeText(e);
      });
    });

    languageEl.addEventListener("change", ({ target: { value } }) => {
      onLanguageSwitchHandler(value);
    });

    searchInputsEl.forEach((el) => {
      el.addEventListener("input", ({ target: { value } }) =>
        onSearchHandler(value)
      );
    });
  }

  init();
})();
