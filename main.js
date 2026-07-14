(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const menuState = $('#menuState');
  const menuToggle = $('.menu-toggle');
  const siteNav = $('.site-nav');
  const header = $('.site-header');
  const splash = $('.splash-screen');
  const welcomeState = $('#welcomeDismiss');
  const welcomeBackdrop = $('.welcome-backdrop');
  const backgroundMusic = $('#backgroundMusic');
  let musicStarted = false;
  let musicFinished = false;
  let musicAttemptPending = false;

  function removeMusicUnlockListeners() {
    document.removeEventListener('pointerdown', tryStartBackgroundMusic);
    document.removeEventListener('keydown', tryStartBackgroundMusic);
    document.removeEventListener('touchstart', tryStartBackgroundMusic);
  }

  function tryStartBackgroundMusic() {
    if (!backgroundMusic || musicStarted || musicFinished || musicAttemptPending) return;
    if (!backgroundMusic.paused) {
      musicStarted = true;
      removeMusicUnlockListeners();
      return;
    }

    musicAttemptPending = true;
    const playRequest = backgroundMusic.play();
    if (!playRequest || typeof playRequest.then !== 'function') {
      musicStarted = true;
      musicAttemptPending = false;
      removeMusicUnlockListeners();
      return;
    }

    playRequest.then(() => {
      musicStarted = true;
      removeMusicUnlockListeners();
    }).catch(() => {
      // Browsers can block autoplay until the visitor interacts with the page.
    }).finally(() => {
      musicAttemptPending = false;
    });
  }

  if (backgroundMusic) {
    backgroundMusic.loop = false;
    backgroundMusic.volume = 0.28;
    backgroundMusic.addEventListener('ended', () => {
      musicFinished = true;
      musicStarted = false;
      removeMusicUnlockListeners();
    }, { once: true });
    document.addEventListener('pointerdown', tryStartBackgroundMusic, { passive: true });
    document.addEventListener('keydown', tryStartBackgroundMusic);
    document.addEventListener('touchstart', tryStartBackgroundMusic, { passive: true });
    tryStartBackgroundMusic();
  }

  document.documentElement.classList.add('js-ready');

  function syncMenu() {
    if (!menuState || !siteNav) return;
    const isOpen = menuState.checked;
    siteNav.classList.toggle('open', isOpen);
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    }
  }

  function closeMenu() {
    if (!menuState) return;
    menuState.checked = false;
    syncMenu();
  }

  menuState?.addEventListener('change', syncMenu);
  $$('.site-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });
  syncMenu();

  function updateHeader() {
    header?.classList.toggle('scrolled', window.scrollY > 18);
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const navLinks = $$('.nav-link');
  const sections = navLinks
    .map((link) => $(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    }, {
      rootMargin: '-28% 0px -55% 0px',
      threshold: [0, 0.2, 0.5, 1],
    });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  function closeWelcome() {
    if (!welcomeState || !welcomeBackdrop) return;
    welcomeState.checked = true;
    welcomeBackdrop.setAttribute('aria-hidden', 'true');
  }

  function openWelcome() {
    if (!welcomeState || !welcomeBackdrop) return;
    welcomeState.checked = false;
    welcomeBackdrop.removeAttribute('aria-hidden');
    $('.welcome-actions .button', welcomeBackdrop)?.focus();
  }

  welcomeState?.addEventListener('change', () => {
    if (welcomeState.checked) {
      welcomeBackdrop?.setAttribute('aria-hidden', 'true');
    } else {
      welcomeBackdrop?.removeAttribute('aria-hidden');
    }
  });

  welcomeBackdrop?.addEventListener('click', (event) => {
    if (event.target === welcomeBackdrop) closeWelcome();
  });

  // Member cards are the profile source: no separate roster data is created.
  const profileModal = $('#memberProfileModal');
  const profileClose = $('.member-profile-close', profileModal || document);
  const profileImage = $('#memberProfileImage');
  const profileTitle = $('#memberProfileTitle');
  const profileBadge = $('#memberProfileBadge');
  const profileSocials = $('#memberProfileSocials');
  const profileCards = $$('.member-card');
  let profileTrigger = null;
  let previousBodyOverflow = '';

  const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

  function prepareProfileCards() {
    profileCards.forEach((card) => {
      const name = $('.member-info h3', card)?.textContent.trim() || t('members.member');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', t('members.openProfile', { name }));
    });
  }

  function openMemberProfile(card) {
    if (!profileModal || !profileImage || !profileTitle || !profileBadge || !profileSocials) return;

    const image = $('.member-portrait img', card);
    const name = $('.member-info h3', card)?.textContent.trim() || t('members.member');
    const role = $('.member-info p', card)?.textContent.trim() || t('members.member');

    profileTrigger = card;
    if (image?.src) {
      profileImage.src = image.src;
      profileImage.hidden = false;
    } else {
      profileImage.removeAttribute('src');
      profileImage.hidden = true;
    }
    profileImage.alt = image?.alt || name;
    profileTitle.textContent = name;
    profileBadge.textContent = role;
    profileSocials.replaceChildren();

    const links = $$('.member-link', card);
    if (!links.length) {
      const empty = document.createElement('p');
      empty.className = 'profile-social-empty';
      empty.textContent = t('members.noSocials');
      profileSocials.append(empty);
    } else {
      links.forEach((link) => {
        const profileLink = link.cloneNode(true);
        profileLink.className = 'profile-social-link';
        profileLink.target = '_top';
        profileSocials.append(profileLink);
      });
    }

    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    profileModal.hidden = false;
    profileModal.setAttribute('aria-hidden', 'false');
    profileClose?.focus();
  }

  function closeMemberProfile() {
    if (!profileModal || profileModal.hidden) return;
    profileModal.hidden = true;
    profileModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousBodyOverflow;
    profileTrigger?.focus();
    profileTrigger = null;
  }

  prepareProfileCards();
  profileCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      openMemberProfile(card);
    });
    card.addEventListener('keydown', (event) => {
      if (event.target.closest('a, button')) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openMemberProfile(card);
    });
  });
  profileClose?.addEventListener('click', closeMemberProfile);
  profileModal?.addEventListener('click', (event) => {
    if (event.target === profileModal) closeMemberProfile();
  });

  // Gallery posts open in the same accessible, full-screen viewer on click or keyboard.
  const lightbox = $('#galleryLightbox');
  const lightboxClose = $('#lightboxClose');
  const lightboxImage = $('#lightboxImage');
  const lightboxLabel = $('#lightboxLabel');
  const lightboxTitle = $('#lightboxTitle');
  const galleryCards = $$('.gallery-card, .photo-post');
  let galleryTrigger = null;

  function openGalleryPost(card) {
    if (!lightbox || !lightboxImage || !lightboxLabel || !lightboxTitle) return;

    const image = $('.gallery-image', card);
    const label = $('.gallery-label', card)?.textContent.trim() || t('gallery.postLabel');
    const title = $('strong, h3', card)?.textContent.trim() || t('gallery.postLabel');

    galleryTrigger = card;
    lightboxLabel.textContent = label;
    lightboxTitle.textContent = title;
    lightboxImage.hidden = !image;
    if (image?.src) {
      lightboxImage.src = image.src;
    } else {
      lightboxImage.removeAttribute('src');
    }
    lightboxImage.alt = image?.alt || title;
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lightboxClose?.focus();
  }

  function closeGalleryPost() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage?.removeAttribute('src');
    document.body.style.overflow = previousBodyOverflow;
    galleryTrigger?.focus();
    galleryTrigger = null;
  }

  galleryCards.forEach((card) => {
    const title = $('strong, h3', card)?.textContent.trim() || t('gallery.postLabel');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', t('gallery.openPost', { title }));
    card.addEventListener('click', () => openGalleryPost(card));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openGalleryPost(card);
    });
  });

  lightboxClose?.addEventListener('click', closeGalleryPost);
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeGalleryPost();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (profileModal && !profileModal.hidden) closeMemberProfile();
    if (lightbox && !lightbox.hidden) closeGalleryPost();
    if (welcomeState && !welcomeState.checked) closeWelcome();
    if (menuState?.checked) closeMenu();
  });

  if (splash) {
    window.setTimeout(() => {
      splash.classList.add('is-hidden');
      window.setTimeout(() => {
        splash.hidden = true;
      }, 700);
    }, 3000);
  }

  window.setTimeout(() => {
    if (!welcomeState?.checked) {
      $('.welcome-actions .button', welcomeBackdrop)?.focus();
    }
  }, 3400);
})();
