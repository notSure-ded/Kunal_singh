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
 // ================================== //
//  SNAKE GAME LOGIC - FINAL VERSION  //
// ================================== //
(function setupSnakeGame() {
  const modal = document.getElementById("gameModal");
  const closeBtn = document.getElementById("closeGameBtn");
  const canvas = document.getElementById("gameCanvas");
  const gameHintBtn = document.getElementById("gameHintBtn");
  const scoreDisplay = document.getElementById("gameScore");
  const upBtn = document.getElementById("upBtn");
  const downBtn = document.getElementById("downBtn");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  if (!modal || !canvas) return;
  const ctx = canvas.getContext("2d");
  const gridSize = 20;
  let snake,
    food,
    powerUp,
    score,
    highScore = 0,
    direction,
    gameInterval,
    speed,
    particles = [],
    nextDirection = null;
  function initGame() {
    snake = [{ x: 10, y: 10 }];
    food = {};
    powerUp = null;
    score = 0;
    direction = "right";
    nextDirection = null;
    speed = 120;
    particles = [];
    placeFood();
    if (Math.random() > 0.7) placePowerUp();
    updateScore();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
  }
  function placeFood() {
    do {
      food.x = Math.floor(Math.random() * (canvas.width / gridSize));
      food.y = Math.floor(Math.random() * (canvas.height / gridSize));
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }
  function placePowerUp() {
    powerUp = {
      x: Math.floor(Math.random() * (canvas.width / gridSize)),
      y: Math.floor(Math.random() * (canvas.height / gridSize)),
      type: Math.random() > 0.5 ? "speed" : "bonus",
    };
  }
  function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x * gridSize + gridSize / 2,
        y: y * gridSize + gridSize / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color: color,
      });
    }
  }
  function updateParticles() {
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      p.vx *= 0.98;
      p.vy *= 0.98;
    });
  }
  function draw() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw grid
    ctx.strokeStyle = "rgba(100, 116, 139, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    // Draw snake with gradient
    snake.forEach((segment, index) => {
      const opacity = 1 - (index / snake.length) * 0.3;
      const hue = (Date.now() / 50 + index * 10) % 360;
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${opacity})`;
      ctx.fillRect(
        segment.x * gridSize + 1,
        segment.y * gridSize + 1,
        gridSize - 2,
        gridSize - 2
      );
    });
    // Draw food with animation
    const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
    ctx.fillStyle = "#818cf8";
    ctx.shadowColor = "#818cf8";
    ctx.shadowBlur = 10 * pulse;
    const foodSize = gridSize * pulse;
    const foodOffset = (gridSize - foodSize) / 2;
    ctx.fillRect(
      food.x * gridSize + foodOffset,
      food.y * gridSize + foodOffset,
      foodSize,
      foodSize
    );
    ctx.shadowBlur = 0;
    // Draw power-up
    if (powerUp) {
      ctx.fillStyle = powerUp.type === "speed" ? "#fbbf24" : "#34d399";
      ctx.beginPath();
      ctx.arc(
        powerUp.x * gridSize + gridSize / 2,
        powerUp.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Draw particles
    particles.forEach((p) => {
      ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    // Draw score
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillText(`Score: ${score}`, 20, 30);
    if (highScore > 0) {
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText(`High: ${highScore}`, 20, 50);
    }
  }
  function update() {
    if (nextDirection) {
      direction = nextDirection;
      nextDirection = null;
    }
    const head = { ...snake[0] };
    if (direction === "up") head.y--;
    if (direction === "down") head.y++;
    if (direction === "left") head.x--;
    if (direction === "right") head.x++;
    // Wrap around edges
    if (head.x < 0) head.x = canvas.width / gridSize - 1;
    if (head.x * gridSize >= canvas.width) head.x = 0;
    if (head.y < 0) head.y = canvas.height / gridSize - 1;
    if (head.y * gridSize >= canvas.height) head.y = 0;
    snake.unshift(head);
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      createParticles(food.x, food.y, "129, 140, 248");
      placeFood();
      if (Math.random() > 0.7) placePowerUp();
      updateScore();
      // Speed up slightly
      if (speed > 60) {
        speed -= 2;
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
      }
    } else {
      snake.pop();
    }
    // Check power-up collision
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
      if (powerUp.type === "speed") {
        createParticles(powerUp.x, powerUp.y, "251, 191, 36"); // yellow
        const originalSpeed = speed;
        speed = Math.max(50, speed - 40);
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
        setTimeout(() => {
          speed = originalSpeed;
          clearInterval(gameInterval);
          gameInterval = setInterval(gameLoop, speed);
        }, 5000); // Speed boost lasts 5 seconds
      } else {
        // bonus
        score += 50;
        createParticles(powerUp.x, powerUp.y, "52, 211, 153"); // green
        updateScore();
      }
      powerUp = null;
    }
    // Check self collision
    for (let i = 1; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        endGame();
        return;
      }
    }
  }
  function endGame() {
    clearInterval(gameInterval);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snakeHighScore", highScore);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px Inter, sans-serif";
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("Restarting...", canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = "left";
    setTimeout(initGame, 2500);
  }
  function gameLoop() {
    update();
    updateParticles();
    draw();
  }
  function updateScore() {
    if (scoreDisplay) scoreDisplay.textContent = score;
  }
  function handleDirectionChange(newDirection) {
    if (newDirection === "up" && direction !== "down") nextDirection = "up";
    else if (newDirection === "down" && direction !== "up") nextDirection = "down";
    else if (newDirection === "left" && direction !== "right") nextDirection = "left";
    else if (newDirection === "right" && direction !== "left") nextDirection = "right";
  }
  function keydownHandler(e) {
    const keyMap = {
      ArrowUp: "up",
      w: "up",
      W: "up",
      ArrowDown: "down",
      s: "down",
      S: "down",
      ArrowLeft: "left",
      a: "left",
      A: "left",
      ArrowRight: "right",
      d: "right",
      D: "right",
    };
    const newDirection = keyMap[e.key];
    if (newDirection) {
      e.preventDefault(); // Prevent page scrolling
      handleDirectionChange(newDirection);
    }
  }
  function openGame() {
    if (!modal) return;
    modal.style.display = "flex";
    highScore = parseInt(localStorage.getItem("snakeHighScore") || "0", 10);
    initGame();
    document.addEventListener("keydown", keydownHandler);
  }
  function closeGame() {
    if (!modal) return;
    modal.style.display = "none";
    if (gameInterval) clearInterval(gameInterval);
    document.removeEventListener("keydown", keydownHandler);
  }
  gameHintBtn?.addEventListener("click", openGame);
  closeBtn?.addEventListener("click", closeGame);
  upBtn?.addEventListener("click", () => handleDirectionChange("up"));
  downBtn?.addEventListener("click", () => handleDirectionChange("down"));
  leftBtn?.addEventListener("click", () => handleDirectionChange("left"));
  rightBtn?.addEventListener("click", () => handleDirectionChange("right"));
})();
// Konami Code sequence
const konamiCode = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
let konamiIndex = 0;
document.addEventListener("keydown", (e) => {
  if (document.getElementById("gameModal")?.style.display === "flex") return;
  if (e.key === konamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      document.getElementById("gameHintBtn")?.click();
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});
// Particle effect on click
document.addEventListener("click", (e) => {
  if (e.target.closest("a, button")) return;
  for (let i = 0; i < 5; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 8 + 4;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = `hsl(${Math.random() * 60 + 220}, 80%, 60%)`;
    p.style.borderRadius = "50%";
    p.style.left = `${e.clientX}px`;
    p.style.top = `${e.clientY}px`;
    p.style.setProperty("--tx", `${(Math.random() - 0.5) * 100}px`);
    p.style.setProperty("--ty", `${(Math.random() - 0.5) * 100}px`);
    p.style.zIndex = "9999";
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
});
// Initial call for GitHub repos
setGithubUsername("notSure-ded");
})();


