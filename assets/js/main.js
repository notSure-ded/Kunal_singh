(function () {
  // Theme: respect saved preference, fallback to system
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = root.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Smooth scroll for in-page anchors
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[href^="#"]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }
  });

  // Set external GitHub links once username is provided
  window.setGithubUsername = function setGithubUsername(username) {
    const profileUrl = `https://github.com/${username}`;
    const githubLink = document.getElementById('githubLink');
    const githubFooter = document.getElementById('githubFooter');
    if (githubLink) githubLink.href = profileUrl;
    if (githubFooter) githubFooter.href = profileUrl;

    fetchAndRenderRepos(username).catch((err) => {
      console.error('Failed to load repos', err);
    });
  };
  
  async function fetchAndRenderRepos(username) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full text-sm text-slate-500">Loading repositories…</div>';

    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
    if (!res.ok) {
      grid.innerHTML = '<div class="col-span-full text-sm text-red-600">Could not load repositories.</div>';
      return;
    }
    const repos = await res.json();
    const curated = repos.filter(r => !r.fork && !r.archived).filter(r => {
        const n = (r.name || '').toLowerCase();
        const isAttr = n.includes('new') && n.includes('attritiona');
        const isKpa = n === 'kpa' || /^kpa[-_]/i.test(r.name || '');
        const isNewAttSite = n === 'newatt.github.io';
        const isHcp = n === 'hcp' || /^hcp[-_.]/i.test(r.name || '');
        const isBackendDeploy = n === 'backend_deploy';
        return !isAttr && !isKpa && !isNewAttSite && !isHcp && !isBackendDeploy;
    }).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 9);

    if (curated.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-sm text-slate-500">No suitable repositories found.</div>';
      return;
    }

    grid.innerHTML = '';
    for (const repo of curated) {
      const card = document.createElement('a');
      card.href = repo.html_url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.className = 'group rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-brand-400/60 hover:shadow-xl transition-colors will-change-transform';

      const description = repo.description ? repo.description : 'No description provided.';
      const language = repo.language ? `<span class="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">${repo.language}</span>` : '';
      const stars = repo.stargazers_count ? `<span class="inline-flex items-center gap-1 text-xs">★ ${repo.stargazers_count}</span>` : '';
      const cover = pickCoverForRepo(repo);

      card.innerHTML = `
        <div class="h-full w-full" data-tilt>
          <div class="h-40 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900 mb-4">
            <img src="${cover}" alt="${repo.name} cover" class="h-full w-full object-cover transform transition-transform duration-300 group-hover:scale-105" onerror="this.parentElement.classList.add('bg-gradient-to-br','from-slate-100','to-slate-200','dark:from-slate-900','dark:to-slate-800'); this.remove();" />
          </div>
          <h3 class="font-semibold tracking-tight">${repo.name}</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">${description}</p>
          <div class="mt-3 flex items-center gap-3 text-slate-500">${language}${stars}</div>
        </div>
      `;
      grid.appendChild(card);
    }
    
    applyGlowEffect();
    startProjectCardObserver();
  }

  function pickCoverForRepo(repo) {
    const nameKey = (repo.name || '').toLowerCase();
    const text = `${repo.name} ${repo.description || ''}`.toLowerCase();
    const specific = {'healthcare': './assets/covers/health.jpg','travel-dj': './assets/covers/travel.png','eventdb': './assets/covers/event.jpg','voice-chat-on-intent': './assets/covers/sound.jpg',};
    if (specific[nameKey]) return specific[nameKey];
    const mapping = [
        { key: /(voice-chat-on-intent|intent|voice-chat|voice-intent)/, img: './assets/covers/sound.jpg'},
        { key: /(health|medic|hospital|patient|nutrition)/, img: './assets/covers/health.jpg' },
        { key: /(travel|trip|tour|dj)/, img: './assets/covers/travel.png' },
        { key: /(event|meet|conference)/, img: './assets/covers/event.jpg' },
        { key: /(traffic|vehicle|road|cv|yolo|object\s*detection)/, img: './assets/covers/vision.jpg' },
        { key: /(network|packet|pcap|sniff|threat|security)/, img: './assets/covers/network.jpg' },
        { key: /(posture|pose|mediapipe)/, img: './assets/covers/posture.jpg' },
        { key: /(scrap|crawler|rfq|alibaba)/, img: './assets/covers/scrape.jpg' },
        { key: /(chat|bot|nlp|intent)/, img: './assets/covers/chatbot.jpg' },
        { key: /(backend|api|server|express|flask)/, img: './assets/covers/backend.jpg' },
        { key: /(voice|audio|speech|sound)/, img: './assets/covers/audio.jpg' }
    ];
    for (const { key, img } of mapping) {
      if (key.test(text)) return img;
    }
    return './assets/covers/default.jpg';
  }

  (function applyPinnedCovers() {
    document.querySelectorAll('#pinned [data-repo] .cover').forEach((coverEl) => {
      const anchor = coverEl.closest('[data-repo]');
      if (!anchor) return;
      const repoFull = anchor.getAttribute('data-repo');
      if (!repoFull) return;
      const name = repoFull.split('/')[1] || repoFull;
      const mockRepo = { name, description: name.replace(/[-_]/g, ' ') };
      const src = pickCoverForRepo(mockRepo);
      const img = new Image();
      img.alt = `${name} cover`;
      img.className = 'h-full w-full object-cover';
      img.onload = () => coverEl.appendChild(img);
      img.onerror = () => { coverEl.classList.add('bg-gradient-to-br','from-slate-100','to-slate-200','dark:from-slate-900','dark:to-slate-800'); };
      img.src = src;
    });
  })();

  function startProjectCardObserver() {
    const projectGrid = document.getElementById('projectsGrid');
    if (!projectGrid) return;
    const projectObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const cards = projectGrid.querySelectorAll('a');
        cards.forEach((card, index) => {
          card.classList.add('card-blur-reveal');
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.filter = 'blur(0)';
          }, 150 * index);
        });
        projectObserver.unobserve(projectGrid);
      }
    }, { threshold: 0.1 });
    projectObserver.observe(projectGrid);
  }

  const revealTargets = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-on');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15 });
  revealTargets.forEach((el) => io.observe(el));

  const tiltElements = () => document.querySelectorAll('[data-tilt]');
  const handleTilt = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * 6;
    const rotateX = -((y - midY) / midY) * 6;
    el.style.transform = `perspective(700px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`;
  };
  const resetTilt = (e) => {
    e.currentTarget.style.transform = '';
  };
  const bindTilt = () => {
    tiltElements().forEach((el) => {
      el.addEventListener('mousemove', handleTilt);
      el.addEventListener('mouseleave', resetTilt);
    });
  };
  bindTilt();

  const typeEl = document.getElementById('typewriter');
  const phrases = [ 'Full‑stack · ML · Systems', 'Object detection · YOLOv8', 'Audio & Speech · Classification', 'Network Traffic · Analysis', ];
  let pi = 0, ci = 0, deleting = false;
  const type = () => {
    if (!typeEl) return;
    const current = phrases[pi];
    typeEl.textContent = current.slice(0, ci);
    if (!deleting) {
      if (ci < current.length) { ci++; } 
      else { deleting = true; setTimeout(type, 1200); return; }
    } else {
      if (ci > 0) { ci--; } 
      else { deleting = false; pi = (pi + 1) % phrases.length; }
    }
    const delay = deleting ? 40 : 80;
    setTimeout(type, delay);
  };
  type();

  function applyGlowEffect() {
    const cards = document.querySelectorAll('#projectsGrid a, #pinned a');
    cards.forEach(card => {
      card.classList.add('glow-card');
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
      });
    });
  }
  
  applyGlowEffect();
  
  // ================================== //
  //  SNAKE GAME LOGIC                  //
  // ================================== //
  (function setupSnakeGame() {
    const modal = document.getElementById('gameModal');
    const closeBtn = document.getElementById('closeGameBtn');
    const canvas = document.getElementById('gameCanvas');
    const gameHintBtn = document.getElementById('gameHintBtn'); // Get the new button
    if (!modal || !canvas || !closeBtn || !gameHintBtn) return;
  
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    let snake, food, score, direction, gameInterval;
    
    const snakeColor = '#6366f1';
    const foodColor = '#818cf8';
  
    function initGame() {
      snake = [{ x: 10, y: 10 }];
      food = {};
      score = 0;
      direction = 'right';
      placeFood();
      if (gameInterval) clearInterval(gameInterval);
      gameInterval = setInterval(gameLoop, 120); // Slightly faster for more fun
    }
  
    function placeFood() {
      food.x = Math.floor(Math.random() * (canvas.width / gridSize));
      food.y = Math.floor(Math.random() * (canvas.height / gridSize));
    }
  
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      snake.forEach(segment => {
        ctx.fillStyle = snakeColor;
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1); // Added gap
      });
      ctx.fillStyle = foodColor;
      ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 1, gridSize - 1); // Added gap
      ctx.fillStyle = 'white';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText(`Score: ${score}`, 10, 20);
    }
  
    function update() {
      const head = { ...snake[0] };
      if (direction === 'up') head.y--;
      if (direction === 'down') head.y++;
      if (direction === 'left') head.x--;
      if (direction === 'right') head.x++;
      
      // --- NEW: WRAP AROUND (NO WALLS) LOGIC ---
      if (head.x < 0) head.x = (canvas.width / gridSize) - 1;
      if (head.x * gridSize >= canvas.width) head.x = 0;
      if (head.y < 0) head.y = (canvas.height / gridSize) - 1;
      if (head.y * gridSize >= canvas.height) head.y = 0;
  
      snake.unshift(head);
  
      if (head.x === food.x && head.y === food.y) {
        score++;
        placeFood();
      } else {
        snake.pop();
      }
  
      const selfCollision = snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
      
      if (selfCollision) { // Game over only on self-collision
        clearInterval(gameInterval);
        ctx.fillStyle = 'white';
        ctx.font = '24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Game Over! Score: ${score}`, canvas.width / 2, canvas.height / 2);
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Press "Enter" to restart', canvas.width / 2, canvas.height / 2 + 30);
      }
    }
    
    function gameLoop() {
      update();
      draw();
    }
  
    function changeDirection(e) {
      const key = e.key;
      const isGameOver = snake.slice(1).some(segment => segment.x === snake[0].x && segment.y === snake[0].y);
  
      if ((key === 'ArrowUp' || key.toLowerCase() === 'w') && direction !== 'down') direction = 'up';
      if ((key === 'ArrowDown' || key.toLowerCase() === 's') && direction !== 'up') direction = 'down';
      if ((key === 'ArrowLeft' || key.toLowerCase() === 'a') && direction !== 'right') direction = 'left';
      if ((key === 'ArrowRight' || key.toLowerCase() === 'd') && direction !== 'left') direction = 'right';
      if (key === 'Enter' && isGameOver) {
          initGame();
      }
    }
    
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    
    function checkKonamiCode(e) {
      if (modal.classList.contains('hidden') && e.key.toLowerCase() === konamiCode[konamiIndex].toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          konamiIndex = 0;
          openGame();
        }
      } else {
        konamiIndex = 0;
      }
    }
    
    function openGame() {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      initGame();
      window.addEventListener('keydown', changeDirection);
    }
    
    function closeGame() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      clearInterval(gameInterval);
      window.removeEventListener('keydown', changeDirection);
    }
  
    window.addEventListener('keydown', checkKonamiCode);
    closeBtn.addEventListener('click', closeGame);
    gameHintBtn.addEventListener('click', openGame); // Add click listener for the button
  })();

})();
