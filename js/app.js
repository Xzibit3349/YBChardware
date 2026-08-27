(function () {
  'use strict';

  // ================= 状态 =================
  var state = {
    powerOn: true,
    currentPage: 'home',
    unlocked: { z01: false, z02: false, z03: false, z04: false, z05: false, z06: false },
    focusIndex: 0,
    themeSelected: 0,
    volume: 70,
    pet: { fullness: 80, cleanliness: 60 }
  };

  var MODULE_LABEL = { z01: '主页个性化', z02: '音乐', z02b: '单词', z03: '打砖块', z04: 'AI对话', z05: 'AI虚拟养成', z06: '二维码' };
  var MODULE_CODE = { z01: 'Z01', z02: 'Z02', z02b: 'Z02', z03: 'Z03', z04: 'Z04', z05: 'Z05', z06: 'Z06' };

  var screen = document.getElementById('screen');
  var lockToast = document.getElementById('lockToast');
  var powerOverlay = document.getElementById('powerOverlay');
  var legendLR = document.getElementById('legendLR');
  var legendRing = document.getElementById('legendRing');
  var legendBack = document.getElementById('legendBack');

  function pageEl(name) { return document.getElementById('page-' + name); }

  // ================= 焦点管理 =================
  function focusables(pageName) {
    var el = pageEl(pageName);
    if (!el) return [];
    return Array.prototype.slice.call(el.querySelectorAll('.focusable'));
  }

  function clearFocus(pageName) {
    focusables(pageName).forEach(function (f) { f.classList.remove('focused'); });
  }

  function applyFocus(pageName) {
    var list = focusables(pageName);
    if (!list.length) return;
    if (state.focusIndex >= list.length) state.focusIndex = 0;
    if (state.focusIndex < 0) state.focusIndex = list.length - 1;
    clearFocus(pageName);
    list[state.focusIndex].classList.add('focused');
    if (pageName === 'menu') updateCarousel();
    if (pageName === 'z01') updateFaceCarousel();
  }

  // ================= 图标菜单轮播（单图标 Apple Watch 式）=================
  var carouselTrack = document.getElementById('carouselTrack');
  var hintLeft = document.getElementById('hintLeft');
  var hintRight = document.getElementById('hintRight');

  function updateCarousel() {
    var list = focusables('menu');
    var idx = state.focusIndex;
    if (carouselTrack) {
      carouselTrack.style.transform = 'translateX(-' + (idx * 100) + '%)';
    }
    if (hintLeft) hintLeft.classList.toggle('hidden', idx <= 0);
    if (hintRight) hintRight.classList.toggle('hidden', idx >= list.length - 1);
  }

  // ================= Z01 主页表盘画廊 =================
  var faceTrack = document.getElementById('faceTrack');
  var faceHintLeft = document.getElementById('faceHintLeft');
  var faceHintRight = document.getElementById('faceHintRight');

  function updateFaceCarousel() {
    var list = focusables('z01');
    var idx = state.focusIndex;
    if (faceTrack) {
      faceTrack.style.transform = 'translateX(-' + (idx * 100) + '%)';
    }
    if (faceHintLeft) faceHintLeft.classList.toggle('hidden', idx <= 0);
    if (faceHintRight) faceHintRight.classList.toggle('hidden', idx >= list.length - 1);
  }

  function moveFocus(dir) {
    if (state.currentPage === 'home') return; // 表盘主页无左右操作
    noteActivity();
    if (state.currentPage === 'settings') {
      adjustVolume(dir * 10);
      return;
    }
    if (state.currentPage === 'z02b') {
      wordMove(dir);
      return;
    }
    if (state.currentPage === 'z03') {
      gameHandleDir(dir);
      return;
    }
    var list = focusables(state.currentPage);
    if (!list.length) return;
    var next = state.focusIndex + dir;
    if (state.currentPage === 'menu' || state.currentPage === 'z01') {
      // 图标菜单 / 表盘画廊不循环，到边界即停
      if (next < 0 || next >= list.length) return;
    } else {
      if (next < 0) next = list.length - 1;
      if (next >= list.length) next = 0;
    }
    state.focusIndex = next;
    applyFocus(state.currentPage);
  }

  function currentFocused() {
    var list = focusables(state.currentPage);
    return list[state.focusIndex] || null;
  }

  // ================= 页面切换 =================
  function goPage(name) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var el = pageEl(name);
    if (!el) return;
    el.classList.add('active');
    state.currentPage = name;
    state.focusIndex = 0;
    applyFocus(name);
    updateLegend();
    if (name === 'settings') renderVolume();
    if (name === 'z03') gameReset();
    if (name === 'z04') aiChatReset();
    else if (aiChat && aiChat.state !== 'idle') aiChatAbort();
    armIdleTimer();
  }

  function updateLegend() {
    if (state.currentPage === 'home') {
      legendLR.textContent = '——';
      legendRing.textContent = '打开菜单';
      legendBack.textContent = '——';
    } else if (state.currentPage === 'menu') {
      legendLR.textContent = '移动焦点';
      legendRing.textContent = '进入模块';
      legendBack.textContent = '返回主页';
    } else if (state.currentPage === 'settings') {
      legendLR.textContent = '调节音量';
      legendRing.textContent = '——';
      legendBack.textContent = '返回菜单';
    } else {
      legendLR.textContent = '移动焦点 / 操作';
      legendRing.textContent = ringHintFor(state.currentPage);
      legendBack.textContent = '返回菜单';
    }
  }

  // ================= 图标菜单空闲超时（5秒无操作回表盘主页） =================
  var IDLE_TIMEOUT_MS = 5000;
  var idleTimer = null;

  function armIdleTimer() {
    clearTimeout(idleTimer);
    if (state.currentPage !== 'menu') return;
    idleTimer = setTimeout(function () {
      if (state.currentPage === 'menu') goPage('home');
    }, IDLE_TIMEOUT_MS);
  }

  function noteActivity() {
    if (state.currentPage === 'menu') armIdleTimer();
  }

  function ringHintFor(page) {
    switch (page) {
      case 'z01': return '应用表盘';
      case 'z02': return '播放 / 暂停';
      case 'z02b': return '播放单词';
      case 'z03': return '调节球速';
      case 'z04': return '开始 / 结束说话';
      case 'z05': return '喂养 / 洗澡';
      case 'z06': return '预览扫码内容';
      default: return '确认';
    }
  }

  // ================= 解锁逻辑 =================
  function unlockKeyFor(cardEl) {
    return cardEl.getAttribute('data-unlock-key') || cardEl.getAttribute('data-key');
  }

  function updateUnlockUI() {
    document.querySelectorAll('.app-card[data-key]').forEach(function (card) {
      var key = unlockKeyFor(card);
      card.classList.toggle('unlocked', !!state.unlocked[key]);
    });

    document.querySelectorAll('.demo-chip').forEach(function (chip) {
      var key = chip.getAttribute('data-toggle');
      chip.classList.toggle('on', !!state.unlocked[key]);
    });
  }

  function showToast(msg) {
    lockToast.textContent = msg;
    lockToast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      lockToast.classList.remove('show');
    }, 1600);
  }

  // ================= 交互：背后键（退回上一级）=================
  function handleBack() {
    if (!state.powerOn) return;

    if (state.currentPage === 'home') return; // 表盘主页已是最顶层，无上一级

    if (state.currentPage === 'menu') {
      goPage('home');
      return;
    }

    // 其它子页面：背后键点击 = 返回图标菜单
    goMenuFrom(state.currentPage);
  }

  function goMenuFrom(page) {
    state.focusIndex = 0;
    goPage('menu');
    // 恢复到该模块卡片的焦点位置，便于连续演示
    var idx = focusables('menu').findIndex(function (f) { return f.getAttribute('data-key') === page; });
    if (idx >= 0) {
      state.focusIndex = idx;
      applyFocus('menu');
    }
  }

  // ================= 交互：顶部圆环（进入下一级 / 模块内主操作） =================
  function handleRing() {
    if (!state.powerOn) return;

    if (state.currentPage === 'home') {
      // 表盘主页：圆环打开图标菜单
      goPage('menu');
      return;
    }

    if (state.currentPage === 'menu') {
      var focused = currentFocused();
      if (!focused) return;
      var key = focused.getAttribute('data-key');
      if (key === 'settings') {
        goPage('settings');
        return;
      }
      var unlockKey = unlockKeyFor(focused);
      if (state.unlocked[unlockKey]) {
        goPage(key);
      } else {
        showToast('完成 ' + MODULE_CODE[key] + ' 课程后解锁「' + MODULE_LABEL[key] + '」');
      }
      return;
    }

    if (state.currentPage === 'settings') return;

    switch (state.currentPage) {
      case 'z01':
        applyThemeSelection();
        break;
      case 'z02':
        togglePlay();
        break;
      case 'z02b':
        speakWord();
        break;
      case 'z03':
        gameCycleSpeed();
        break;
      case 'z04':
        aiChatRingPress();
        break;
      case 'z05':
        petActionPress();
        break;
      case 'z06':
        showToast('📱 扫码后手机会显示：妈妈，你辛苦了');
        break;
    }
  }

  // ================= 音量调节 =================
  var volIconEl = document.getElementById('volIcon');
  var volTrackFill = document.getElementById('volTrackFill');
  var audioCtx = null;

  function beep(volumePercent) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      var g = Math.max(0.0001, (volumePercent / 100) * 0.2);
      gain.gain.setValueAtTime(g, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) { /* 静默失败，不影响演示 */ }
  }

  function renderVolume() {
    var pct = state.volume;
    if (volIconEl) volIconEl.textContent = pct === 0 ? '🔇' : pct < 50 ? '🔉' : '🔊';
    if (volTrackFill) volTrackFill.style.width = pct + '%';
  }

  function adjustVolume(delta) {
    state.volume = Math.max(0, Math.min(100, state.volume + delta));
    renderVolume();
    beep(state.volume);
  }

  var FACE_THEMES = ['aurora', 'sunrise', 'forest', 'ocean'];
  var FACE_WEATHER = {
    aurora: '🌙 18°C 晴朗',
    sunrise: '🌅 22°C 晴',
    forest: '🌳 20°C 多云',
    ocean: '🌊 26°C 晴'
  };
  var FACE_ILLUSTRATION_HTML = {
    aurora: '<span class="face-moon"></span>' +
      '<span class="face-star s1"></span><span class="face-star s2"></span><span class="face-star s3"></span>' +
      '<span class="face-star s4"></span><span class="face-star s5"></span><span class="face-star s6"></span>',
    sunrise: '<span class="face-sun"></span><span class="face-mountain m1"></span><span class="face-mountain m2"></span>',
    forest: '<span class="face-tree t1"></span><span class="face-tree t2"></span><span class="face-tree t3"></span>',
    ocean: '<span class="face-wave w1"></span><span class="face-wave w2"></span>'
  };
  var homePage = document.getElementById('page-home');
  var homeFaceIllustration = document.getElementById('homeFaceIllustration');
  var homeFaceWeather = document.getElementById('homeFaceWeather');

  function applyFaceThemeToHome(theme) {
    FACE_THEMES.forEach(function (t) { homePage.classList.remove('face-' + t); });
    homePage.classList.add('face-' + theme);
    if (homeFaceIllustration) homeFaceIllustration.innerHTML = FACE_ILLUSTRATION_HTML[theme] || '';
    if (homeFaceWeather) homeFaceWeather.textContent = FACE_WEATHER[theme] || '';
  }

  function applyThemeSelection() {
    var focused = currentFocused();
    if (!focused || !focused.classList.contains('face-card')) return;
    document.querySelectorAll('.face-card').forEach(function (c) { c.classList.remove('selected'); });
    focused.classList.add('selected');
    var theme = FACE_THEMES.filter(function (t) { return focused.classList.contains('face-' + t); })[0];
    if (theme) applyFaceThemeToHome(theme);
    goPage('home');
  }

  // ================= Z05 AI虚拟养成 =================
  var petFullFillEl = document.getElementById('petFullFill');
  var petCleanFillEl = document.getElementById('petCleanFill');
  var petFigureEl = document.getElementById('petFigure');

  function renderPetStats() {
    if (petFullFillEl) petFullFillEl.style.width = state.pet.fullness + '%';
    if (petCleanFillEl) petCleanFillEl.style.width = state.pet.cleanliness + '%';
  }

  function petBounce() {
    if (!petFigureEl) return;
    petFigureEl.classList.remove('bounce');
    void petFigureEl.offsetWidth; // 重启动画
    petFigureEl.classList.add('bounce');
  }

  function petFeed() {
    state.pet.fullness = Math.min(100, state.pet.fullness + 20);
    renderPetStats();
    petBounce();
    showToast('🍖 豹豹吃饱啦！饱食度 +20');
  }

  function petBath() {
    state.pet.cleanliness = Math.min(100, state.pet.cleanliness + 20);
    renderPetStats();
    petBounce();
    showToast('🛁 豹豹洗得干干净净！卫生度 +20');
  }

  function petActionPress() {
    var focused = currentFocused();
    if (!focused) return;
    var action = focused.getAttribute('data-pet-action');
    if (action === 'feed') petFeed();
    else if (action === 'bath') petBath();
  }

  // ================= 音乐播放器 =================
  var MUSIC_TRACKS = [
    { name: '小小星球之歌', duration: 154 },
    { name: '数字大冒险', duration: 138 },
    { name: '字母进行曲', duration: 172 },
    { name: '恐龙摇摆舞', duration: 145 },
    { name: '晚安小夜曲', duration: 190 }
  ];
  var music = {
    trackIndex: 0,
    position: 0,
    playing: false,
    timer: null
  };

  var musicArt = document.getElementById('musicArt');
  var musicTrackNameEl = document.getElementById('musicTrackName');
  var musicProgressFill = document.getElementById('musicProgressFill');
  var musicTimeCurrent = document.getElementById('musicTimeCurrent');
  var musicTimeTotal = document.getElementById('musicTimeTotal');
  var musicPlayIcon = document.getElementById('musicPlayIcon');

  function formatTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function renderMusic() {
    var track = MUSIC_TRACKS[music.trackIndex];
    if (musicTrackNameEl) musicTrackNameEl.textContent = track.name;
    if (musicTimeTotal) musicTimeTotal.textContent = formatTime(track.duration);
    if (musicTimeCurrent) musicTimeCurrent.textContent = formatTime(music.position);
    if (musicProgressFill) musicProgressFill.style.width = (music.position / track.duration * 100) + '%';
    if (musicPlayIcon) musicPlayIcon.textContent = music.playing ? '⏸' : '▶';
    if (musicArt) musicArt.classList.toggle('spin', music.playing);
  }

  function stopMusicTimer() {
    clearInterval(music.timer);
    music.timer = null;
  }

  function startMusicTimer() {
    stopMusicTimer();
    music.timer = setInterval(function () {
      var track = MUSIC_TRACKS[music.trackIndex];
      music.position += 1;
      if (music.position >= track.duration) {
        musicNext();
        return;
      }
      renderMusic();
    }, 1000);
  }

  function musicPlayPause() {
    music.playing = !music.playing;
    if (music.playing) startMusicTimer(); else stopMusicTimer();
    renderMusic();
  }

  function musicLoadTrack(idx, autoplay) {
    stopMusicTimer();
    var len = MUSIC_TRACKS.length;
    music.trackIndex = ((idx % len) + len) % len;
    music.position = 0;
    music.playing = autoplay;
    if (autoplay) startMusicTimer();
    renderMusic();
  }

  function musicPrev() { musicLoadTrack(music.trackIndex - 1, music.playing); }
  function musicNext() { musicLoadTrack(music.trackIndex + 1, music.playing); }

  function musicSeek(deltaSec) {
    var track = MUSIC_TRACKS[music.trackIndex];
    music.position = Math.max(0, Math.min(track.duration, music.position + deltaSec));
    renderMusic();
  }

  function isMusicTabActive() {
    return state.currentPage === 'z02';
  }

  function togglePlay() {
    musicPlayPause();
  }

  // ================= 单词学习 =================
  var WORD_LIST = [
    { en: 'Robot', phonetic: '/ˈroʊbɑːt/', cn: '机器人' },
    { en: 'Panda', phonetic: '/ˈpændə/', cn: '熊猫' },
    { en: 'Rocket', phonetic: '/ˈrɑːkɪt/', cn: '火箭' },
    { en: 'Planet', phonetic: '/ˈplænɪt/', cn: '星球' },
    { en: 'Friend', phonetic: '/frend/', cn: '朋友' }
  ];
  var wordIndex = 0;

  var wordEnEl = document.getElementById('wordEn');
  var wordPhoneticEl = document.getElementById('wordPhonetic');
  var wordCnEl = document.getElementById('wordCn');
  var wordSpeakerEl = document.getElementById('wordSpeaker');

  function renderWord() {
    var w = WORD_LIST[wordIndex];
    if (wordEnEl) wordEnEl.textContent = w.en;
    if (wordPhoneticEl) wordPhoneticEl.textContent = w.phonetic;
    if (wordCnEl) wordCnEl.textContent = w.cn;
  }

  function wordMove(dir) {
    var len = WORD_LIST.length;
    wordIndex = ((wordIndex + dir) % len + len) % len;
    renderWord();
  }

  function isWordPageActive() {
    return state.currentPage === 'z02b';
  }

  function speakWord() {
    var w = WORD_LIST[wordIndex];
    if (wordSpeakerEl) {
      wordSpeakerEl.classList.remove('playing');
      void wordSpeakerEl.offsetWidth;
      wordSpeakerEl.classList.add('playing');
      setTimeout(function () { wordSpeakerEl.classList.remove('playing'); }, 600);
    }
    try {
      if (window.speechSynthesis) {
        var utter = new SpeechSynthesisUtterance(w.en);
        utter.lang = 'en-US';
        utter.rate = 0.85;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } else {
        beep(70);
      }
    } catch (e) { /* 静默失败，不影响演示 */ }
  }

  // ================= 打砖块游戏 =================
  var GAME_ROWS = 3;
  var GAME_COLS = 10;
  var GAME_SPEED_LEVELS = [1.4, 1.9, 2.5, 3.2, 4.0]; // 5 档，单位 px/frame（基准帧率 60fps）
  var BRICK_COLORS = ['b1', 'b2', 'b3'];
  var PADDLE_W = 46, PADDLE_H = 7, BALL_SIZE = 8;
  var PADDLE_MOVE_STEP = 18;

  var gameBoard = document.getElementById('gameBoard');
  var brickRowsEl = document.getElementById('brickRows');
  var gameBallEl = document.getElementById('gameBall');
  var gamePaddleEl = document.getElementById('gamePaddle');
  var gameOverlayEl = document.getElementById('gameOverlay');
  var gameOverlayTextEl = document.getElementById('gameOverlayText');

  var game = {
    status: 'idle', // idle | playing | won | lost
    speedLevel: 0,
    bricks: [],
    ballX: 0, ballY: 0, ballVX: 0, ballVY: 0,
    paddleX: 0,
    boardW: 0, boardH: 0,
    rafId: null
  };

  function gameBuildBricks() {
    brickRowsEl.innerHTML = '';
    game.bricks = [];
    var boardW = gameBoard.clientWidth - 16; // padding 8px * 2
    var gap = 3;
    var brickW = (boardW - gap * (GAME_COLS - 1)) / GAME_COLS;
    var brickH = 10;
    for (var r = 0; r < GAME_ROWS; r++) {
      for (var c = 0; c < GAME_COLS; c++) {
        var el = document.createElement('span');
        var x = c * (brickW + gap);
        var y = r * (brickH + gap);
        el.className = 'brick ' + BRICK_COLORS[(r + c) % BRICK_COLORS.length];
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.width = brickW + 'px';
        el.style.height = brickH + 'px';
        brickRowsEl.appendChild(el);
        game.bricks.push({ el: el, x: x, y: y, w: brickW, h: brickH, alive: true });
      }
    }
  }

  function gameResetBallAndPaddle() {
    game.boardW = gameBoard.clientWidth;
    game.boardH = gameBoard.clientHeight;
    game.paddleX = (game.boardW - PADDLE_W) / 2;
    game.ballX = game.boardW / 2 - BALL_SIZE / 2;
    game.ballY = game.boardH - 26 - BALL_SIZE;
    var speed = GAME_SPEED_LEVELS[game.speedLevel];
    var angle = -(Math.PI / 4 + Math.random() * (Math.PI / 6)); // 斜向上发射
    game.ballVX = speed * Math.cos(angle) * (Math.random() < 0.5 ? -1 : 1);
    game.ballVY = speed * Math.sin(angle);
    gameRenderPositions();
  }

  function gameRenderPositions() {
    gameBallEl.style.left = game.ballX + 'px';
    gameBallEl.style.top = game.ballY + 'px';
    gamePaddleEl.style.left = game.paddleX + 'px';
    gamePaddleEl.style.bottom = '10px';
    gameBallEl.style.width = BALL_SIZE + 'px';
    gameBallEl.style.height = BALL_SIZE + 'px';
    gamePaddleEl.style.width = PADDLE_W + 'px';
    gamePaddleEl.style.height = PADDLE_H + 'px';
  }

  function gameReset() {
    cancelAnimationFrame(game.rafId);
    game.status = 'idle';
    game.speedLevel = 0;
    gameBuildBricks();
    gameResetBallAndPaddle();
    gameOverlayEl.classList.add('hidden');
  }

  function gameStart() {
    if (game.status === 'playing') return;
    game.status = 'playing';
    gameOverlayEl.classList.add('hidden');
    gameResetBallAndPaddle();
    gameLoop();
  }

  function gameEnd(won) {
    game.status = won ? 'won' : 'lost';
    cancelAnimationFrame(game.rafId);
    gameOverlayEl.classList.remove('hidden');
    gameOverlayTextEl.textContent = won ? '🎉 胜利！砖块全部打完\n按左 / 右手再玩一次' : '💥 没接住球，游戏失败\n按左 / 右手再玩一次';
  }

  function gameCycleSpeed() {
    game.speedLevel = (game.speedLevel + 1) % GAME_SPEED_LEVELS.length;
    if (game.status === 'playing') {
      // 保持方向，只改变速度大小
      var speed = GAME_SPEED_LEVELS[game.speedLevel];
      var curSpeed = Math.sqrt(game.ballVX * game.ballVX + game.ballVY * game.ballVY) || 1;
      var scale = speed / curSpeed;
      game.ballVX *= scale;
      game.ballVY *= scale;
    }
  }

  function gameHandleDir(dir) {
    if (game.status !== 'playing') {
      gameStart();
      return;
    }
    gameMovePaddleStep(dir);
  }

  function isGamePageActive() {
    return state.currentPage === 'z03';
  }

  function gameMovePaddleStep(dir) {
    if (game.status !== 'playing') return;
    game.paddleX = Math.max(0, Math.min(game.boardW - PADDLE_W, game.paddleX + dir * PADDLE_MOVE_STEP));
    gamePaddleEl.style.left = game.paddleX + 'px';
  }

  function gameLoop() {
    if (game.status !== 'playing') return;

    game.ballX += game.ballVX;
    game.ballY += game.ballVY;

    // 左右墙壁反弹
    if (game.ballX <= 0) { game.ballX = 0; game.ballVX = Math.abs(game.ballVX); }
    if (game.ballX >= game.boardW - BALL_SIZE) { game.ballX = game.boardW - BALL_SIZE; game.ballVX = -Math.abs(game.ballVX); }
    // 顶部反弹
    if (game.ballY <= 0) { game.ballY = 0; game.ballVY = Math.abs(game.ballVY); }

    // 挡板碰撞
    var paddleY = game.boardH - 10 - PADDLE_H;
    if (game.ballY + BALL_SIZE >= paddleY &&
        game.ballY + BALL_SIZE <= paddleY + PADDLE_H + 6 &&
        game.ballX + BALL_SIZE >= game.paddleX &&
        game.ballX <= game.paddleX + PADDLE_W &&
        game.ballVY > 0) {
      game.ballY = paddleY - BALL_SIZE;
      // 依据击中挡板的位置微调水平方向，增加可玩性；保持速度大小与当前档位一致，避免多次反弹后速度漂移
      var hitRatio = ((game.ballX + BALL_SIZE / 2) - (game.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      hitRatio = Math.max(-1, Math.min(1, hitRatio));
      var speed = GAME_SPEED_LEVELS[game.speedLevel];
      var maxAngle = Math.PI / 3; // 最大偏转 60 度，避免打出近乎水平的球
      var angle = hitRatio * maxAngle;
      game.ballVX = speed * Math.sin(angle);
      game.ballVY = -speed * Math.cos(angle);
    }

    // 砖块碰撞
    for (var i = 0; i < game.bricks.length; i++) {
      var b = game.bricks[i];
      if (!b.alive) continue;
      if (game.ballX + BALL_SIZE > b.x && game.ballX < b.x + b.w &&
          game.ballY + BALL_SIZE > b.y && game.ballY < b.y + b.h) {
        b.alive = false;
        b.el.classList.add('hit');
        game.ballVY = -game.ballVY;
        break;
      }
    }

    // 未接住球 = 失败
    if (game.ballY > game.boardH) {
      gameEnd(false);
      return;
    }

    // 砖块全部清空 = 胜利
    if (game.bricks.every(function (b) { return !b.alive; })) {
      gameEnd(true);
      return;
    }

    gameRenderPositions();
    game.rafId = requestAnimationFrame(gameLoop);
  }

  // ================= AI 对话（纯状态展示，无对话框） =================
  // 真实的豆包 API Key 只保存在服务端环境变量里（见 api/ai-chat.js），前端只请求这个代理接口。
  var AI_CHAT_PROXY_URL = '/api/ai-chat';

  var voiceIndicatorEl = document.getElementById('voiceIndicator');
  var voiceTextEl = document.getElementById('voiceText');

  var aiChat = {
    state: 'idle', // idle | listening | thinking | speaking
    recognition: null,
    silenceTimer: null,
    requestSeq: 0
  };

  function aiChatSupportsSpeech() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function aiChatRender(indicator, text, indicatorCls, textCls) {
    if (voiceIndicatorEl) voiceIndicatorEl.textContent = indicator || '';
    if (voiceIndicatorEl) voiceIndicatorEl.className = 'voice-indicator' + (indicatorCls ? ' ' + indicatorCls : '');
    if (voiceTextEl) voiceTextEl.textContent = text || '';
    if (voiceTextEl) voiceTextEl.className = 'voice-text' + (textCls ? ' ' + textCls : '');
  }

  function aiChatRenderThinking() {
    if (voiceIndicatorEl) { voiceIndicatorEl.textContent = '🤔'; voiceIndicatorEl.className = 'voice-indicator'; }
    if (voiceTextEl) {
      voiceTextEl.className = 'voice-text thinking-label';
      voiceTextEl.innerHTML = '思考中<span class="think-dot"></span><span class="think-dot"></span><span class="think-dot"></span>';
    }
  }

  var AI_CHAT_SILENCE_MS = 1500; // 停顿超过此时长视为说完，自动进入思考

  function aiChatAbort() {
    if (aiChat.recognition) {
      try { aiChat.recognition.abort(); } catch (e) { /* 忽略 */ }
    }
    clearTimeout(aiChat.silenceTimer);
    aiChat.requestSeq++; // 使正在进行中的豆包请求作废，避免离开页面后收到迟到的回复
    window.speechSynthesis && window.speechSynthesis.cancel();
    aiChat.state = 'idle';
  }

  function aiChatReset() {
    aiChatAbort();
    aiChatRender('', '');
  }

  function aiChatRingPress() {
    if (aiChat.state === 'idle') {
      aiChatStartListening();
    } else if (aiChat.state === 'listening' || aiChat.state === 'starting') {
      aiChatStopListening();
    }
    // thinking / speaking 状态下圆环键不响应，避免中途打断请求
  }

  function aiChatStartListening() {
    if (!aiChatSupportsSpeech()) {
      aiChatRender('⚠️', '当前浏览器不支持语音识别，请用 Chrome 打开', '', 'error');
      return;
    }
    aiChat.state = 'starting';
    var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    var finalText = '';

    recognition.onstart = function () {
      aiChat.state = 'listening';
      aiChatRender('🎤', '', 'listening', 'interim');
    };

    recognition.onresult = function (event) {
      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      // stop() 之后浏览器可能仍会补发一次最终结果，此时已进入思考/结束流程，不应再覆盖为聆听中的界面
      if (aiChat.state !== 'listening') return;
      aiChatRender('🎤', finalText + interim, 'listening', 'interim');

      clearTimeout(aiChat.silenceTimer);
      aiChat.silenceTimer = setTimeout(function () {
        if (aiChat.state !== 'listening') return;
        aiChatStopListening();
      }, AI_CHAT_SILENCE_MS);
    };

    recognition.onerror = function (event) {
      clearTimeout(aiChat.silenceTimer);
      aiChat.state = 'idle';
      var msg;
      if (event.error === 'network') {
        msg = '语音识别服务连接失败，可能需要开启 VPN（Chrome 语音识别依赖 Google 服务，国内网络直连不通）';
      } else if (event.error === 'not-allowed') {
        msg = '没有获得麦克风权限，请允许麦克风后再试';
      } else {
        msg = '语音识别出错：' + event.error + '（可再按圆环键重试）';
      }
      aiChatRender('⚠️', msg, '', 'error');
    };

    recognition.onend = function () {
      if (aiChat.state !== 'listening') return; // 已经被停顿计时器或手动结束流程处理过
      clearTimeout(aiChat.silenceTimer);
      aiChatFinishListening(finalText);
    };

    aiChat.recognition = recognition;
    try {
      recognition.start();
    } catch (e) {
      aiChat.state = 'idle';
      aiChatRender('⚠️', '无法启动语音识别（可再按圆环键重试）', '', 'error');
    }
  }

  function aiChatStopListening() {
    if (!aiChat.recognition) return;
    clearTimeout(aiChat.silenceTimer);
    var finalTextSoFar = voiceTextEl ? voiceTextEl.textContent : '';
    aiChat.state = 'ending';
    try { aiChat.recognition.stop(); } catch (e) { /* 忽略 */ }
    aiChatFinishListening(finalTextSoFar);
  }

  function aiChatFinishListening(text) {
    text = (text || '').trim();
    if (!text) {
      aiChat.state = 'idle';
      aiChatRender('🎤', '没听清，请再按圆环键说一次', '', 'error');
      setTimeout(function () {
        if (aiChat.state === 'idle') aiChatRender('', '');
      }, 2000);
      return;
    }
    aiChatAskDoubao(text);
  }

  var AI_CHAT_REQUEST_TIMEOUT_MS = 20000; // 服务端偶尔较慢，超时后提示用户重试而不是一直卡在思考中

  function aiChatAskDoubao(userText) {
    aiChat.state = 'thinking';
    var requestId = ++aiChat.requestSeq;
    aiChatRenderThinking();

    var controller = window.AbortController ? new AbortController() : null;
    var timedOut = false;
    var timeoutTimer = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
    }, AI_CHAT_REQUEST_TIMEOUT_MS);

    fetch(AI_CHAT_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({ text: userText })
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var errMsg = (data && (data.error && data.error.message || data.message)) || ('HTTP ' + res.status);
          throw new Error(errMsg);
        }
        return data;
      });
    }).then(function (data) {
      clearTimeout(timeoutTimer);
      if (requestId !== aiChat.requestSeq) return; // 页面已切换或用户已重新发起新一轮，忽略过期响应
      var reply = aiChatExtractReplyText(data);
      if (!reply) {
        reply = '（未能解析豹豹的回复，原始返回：' + JSON.stringify(data).slice(0, 200) + '）';
      }
      aiChatSpeak(reply);
    }).catch(function (err) {
      clearTimeout(timeoutTimer);
      if (requestId !== aiChat.requestSeq) return;
      aiChat.state = 'idle';
      var msg = timedOut ? '豹豹想了太久没有回应，请再按圆环键试一次' : '豹豹连接失败了：' + err.message;
      aiChatRender('⚠️', msg, '', 'error');
    });
  }

  // Responses API 的返回结构按 OpenAI 风格猜测解析，做多重兜底；解析不出内容时把原始 JSON 片段展示出来方便排查真实结构。
  function aiChatExtractReplyText(data) {
    if (!data) return null;
    if (typeof data.output_text === 'string' && data.output_text.trim()) {
      return data.output_text.trim();
    }
    if (Array.isArray(data.output)) {
      for (var i = 0; i < data.output.length; i++) {
        var item = data.output[i];
        var contents = item && item.content;
        if (Array.isArray(contents)) {
          for (var j = 0; j < contents.length; j++) {
            var c = contents[j];
            if (c && typeof c.text === 'string' && c.text.trim()) return c.text.trim();
          }
        }
      }
    }
    var choiceMsg = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof choiceMsg === 'string' && choiceMsg.trim()) return choiceMsg.trim();
    return null;
  }

  function aiChatSpeak(text) {
    aiChat.state = 'speaking';
    aiChatRender('🔊', text);
    try {
      if (window.speechSynthesis) {
        var utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-CN';
        utter.rate = 1.0;
        utter.onend = aiChatBackToIdle;
        utter.onerror = aiChatBackToIdle;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } else {
        aiChatBackToIdle();
      }
    } catch (e) {
      aiChatBackToIdle();
    }
  }

  function aiChatBackToIdle() {
    aiChat.state = 'idle';
    aiChatRender('', '');
  }


  // ================= 鼠标点击也可直接触发（辅助演示）=================
  function bindDirectClicks() {
    if (hintLeft) hintLeft.addEventListener('click', function () { moveFocus(-1); });
    if (hintRight) hintRight.addEventListener('click', function () { moveFocus(1); });

    document.querySelectorAll('.app-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var list = focusables('menu');
        var i = list.indexOf(card);
        if (i >= 0) state.focusIndex = i;
        applyFocus('menu');
        handleRing();
      });
    });

    document.querySelectorAll('.face-card, .pet-action')
      .forEach(function (item) {
        item.addEventListener('click', function () {
          var pageList = focusables(state.currentPage);
          var i = pageList.indexOf(item);
          if (i >= 0) {
            state.focusIndex = i;
            applyFocus(state.currentPage);
          }
          if (item.classList.contains('pet-action')) petActionPress();
        });
      });

    document.querySelector('[data-role="prev"]').addEventListener('click', musicPrev);
    document.querySelector('[data-role="next"]').addEventListener('click', musicNext);
    document.querySelector('[data-role="play"]').addEventListener('click', musicPlayPause);
    if (wordSpeakerEl) wordSpeakerEl.addEventListener('click', speakWord);

    if (faceHintLeft) faceHintLeft.addEventListener('click', function () { moveFocus(-1); });
    if (faceHintRight) faceHintRight.addEventListener('click', function () { moveFocus(1); });
  }

  // ================= 物理按键绑定 =================
  var LONG_PRESS_MS = 650;
  var backPressTimer = null;
  var backLongTriggered = false;

  function bindDeviceButtons() {
    var btnLeft = document.getElementById('btnLeft');
    var btnRight = document.getElementById('btnRight');
    var btnRing = document.getElementById('btnRing');
    var btnBack = document.getElementById('btnBack');

    bindPawButton(btnLeft, -1);
    bindPawButton(btnRight, 1);

    btnRing.addEventListener('click', function () {
      pressFx(btnRing);
      noteActivity();
      handleRing();
    });

    btnBack.addEventListener('mousedown', startBackPress);
    btnBack.addEventListener('touchstart', startBackPress, { passive: true });
    btnBack.addEventListener('mouseup', endBackPress);
    btnBack.addEventListener('mouseleave', cancelBackPress);
    btnBack.addEventListener('touchend', endBackPress);

    function startBackPress() {
      backLongTriggered = false;
      backPressTimer = setTimeout(function () {
        backLongTriggered = true;
        togglePower();
      }, LONG_PRESS_MS);
    }

    function endBackPress() {
      clearTimeout(backPressTimer);
      pressFx(btnBack);
      if (!backLongTriggered) {
        noteActivity();
        handleBack();
      }
      backLongTriggered = false;
    }

    function cancelBackPress() {
      clearTimeout(backPressTimer);
      backLongTriggered = false;
    }
  }

  var SEEK_START_DELAY_MS = 500;
  var SEEK_STEP_MS = 200;
  var SEEK_STEP_SEC = 3;
  var PADDLE_HOLD_STEP_MS = 30;

  function bindPawButton(el, dir) {
    var pressTimer = null;
    var seekInterval = null;
    var longTriggered = false;

    function startPress() {
      longTriggered = false;

      if (isGamePageActive() && game.status === 'playing') {
        longTriggered = true; // 游戏进行中，按下即持续移动挡板，不走短按逻辑
        gameMovePaddleStep(dir);
        seekInterval = setInterval(function () { gameMovePaddleStep(dir); }, PADDLE_HOLD_STEP_MS);
        return;
      }

      if (!isMusicTabActive()) return;
      pressTimer = setTimeout(function () {
        longTriggered = true;
        el.classList.add('pressed');
        var icon = document.querySelector(dir < 0 ? '[data-role="prev"]' : '[data-role="next"]');
        if (icon) icon.classList.add('seeking');
        musicSeek(dir * SEEK_STEP_SEC);
        seekInterval = setInterval(function () { musicSeek(dir * SEEK_STEP_SEC); }, SEEK_STEP_MS);
      }, SEEK_START_DELAY_MS);
    }

    function endPress() {
      clearTimeout(pressTimer);
      clearInterval(seekInterval);
      var icon = document.querySelector(dir < 0 ? '[data-role="prev"]' : '[data-role="next"]');
      if (icon) icon.classList.remove('seeking');
      pressFx(el);
      if (!longTriggered) {
        if (!state.powerOn) return;
        noteActivity();
        if (isMusicTabActive()) {
          if (dir < 0) musicPrev(); else musicNext();
        } else {
          moveFocus(dir);
        }
      }
      longTriggered = false;
    }

    function cancelPress() {
      clearTimeout(pressTimer);
      clearInterval(seekInterval);
      var icon = document.querySelector(dir < 0 ? '[data-role="prev"]' : '[data-role="next"]');
      if (icon) icon.classList.remove('seeking');
      longTriggered = false;
    }

    el.addEventListener('mousedown', startPress);
    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('mouseup', endPress);
    el.addEventListener('touchend', endPress);
    el.addEventListener('mouseleave', cancelPress);
  }

  function pressFx(el) {
    el.classList.add('pressed');
    setTimeout(function () { el.classList.remove('pressed'); }, 140);
  }

  function togglePower() {
    state.powerOn = !state.powerOn;
    powerOverlay.classList.toggle('show', !state.powerOn);
    if (state.powerOn) {
      goPage('home');
    } else {
      clearTimeout(idleTimer);
      if (music.playing) musicPlayPause();
    }
  }

  // ================= 演示控制台 =================
  function bindDemoConsole() {
    document.querySelectorAll('.demo-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-toggle');
        state.unlocked[key] = !state.unlocked[key];
        updateUnlockUI();
      });
    });

    document.getElementById('demoReset').addEventListener('click', function () {
      Object.keys(state.unlocked).forEach(function (k) { state.unlocked[k] = false; });
      updateUnlockUI();
      if (state.currentPage !== 'home' && state.currentPage !== 'menu' && state.currentPage !== 'settings') goPage('menu');
    });

    document.getElementById('demoUnlockAll').addEventListener('click', function () {
      Object.keys(state.unlocked).forEach(function (k) { state.unlocked[k] = true; });
      updateUnlockUI();
    });
  }

  // ================= 键盘辅助（可选，便于用电脑演示）=================
  function bindKeyboard() {
    var repeating = {};
    document.addEventListener('keydown', function (e) {
      if (repeating[e.key]) return; // 忽略系统自动重复触发，长按由 mousedown 保持计时
      repeating[e.key] = true;
      if (e.key === 'ArrowLeft') { document.getElementById('btnLeft').dispatchEvent(new Event('mousedown')); }
      else if (e.key === 'ArrowRight') { document.getElementById('btnRight').dispatchEvent(new Event('mousedown')); }
      else if (e.key === 'Enter' || e.key === ' ') { document.getElementById('btnRing').click(); }
      else if (e.key === 'Backspace') { document.getElementById('btnBack').dispatchEvent(new Event('mousedown')); }
    });
    document.addEventListener('keyup', function (e) {
      repeating[e.key] = false;
      if (e.key === 'ArrowLeft') { document.getElementById('btnLeft').dispatchEvent(new Event('mouseup')); }
      else if (e.key === 'ArrowRight') { document.getElementById('btnRight').dispatchEvent(new Event('mouseup')); }
      else if (e.key === 'Backspace') { document.getElementById('btnBack').dispatchEvent(new Event('mouseup')); }
    });
  }

  // ================= 表盘时钟 =================
  function tickClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var dateStr = days[now.getDay()] + ' · ' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    document.querySelectorAll('[data-clock-time]').forEach(function (el) { el.textContent = h + ':' + m; });
    document.querySelectorAll('[data-clock-date]').forEach(function (el) { el.textContent = dateStr; });
  }

  // ================= 初始化 =================
  function init() {
    bindDeviceButtons();
    bindDirectClicks();
    bindDemoConsole();
    bindKeyboard();
    updateUnlockUI();
    goPage('home');
    tickClock();
    setInterval(tickClock, 30000);
    renderMusic();
    renderWord();
    renderPetStats();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
