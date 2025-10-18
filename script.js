// DOM Elements
const playerContainer = document.querySelector('.player-container');
const loadingOverlay = document.querySelector('.loading-overlay');
const video = document.querySelector('.video');
const centralPlayBtn = document.querySelector('.central-play-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const volumeBtn = document.getElementById('volume-btn');
const progressBar = document.querySelector('.progress-bar');
const progressFilled = document.querySelector('.progress-filled');
const bufferBar = document.querySelector('.buffer-bar');
const timeDisplay = document.querySelector('.time-display');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const fullscreenTooltip = fullscreenBtn.querySelector('.tooltip');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.querySelector('.settings-menu');
const closeSettingsBtn = settingsMenu.querySelector('.close-btn');
const speedOptions = settingsMenu.querySelectorAll('li');

let hls = new Hls();
let controlsTimeout;

// === পরিবর্তন এখানে (Wake Lock এর জন্য নতুন ভ্যারিয়েবল) ===
let wakeLock = null;

// === Wake Lock চালু করার জন্য নতুন ফাংশন ===
const requestWakeLock = async () => {
  // Wake Lock API ব্রাউজারে সাপোর্ট করে কি না তা চেক করা হচ্ছে
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock is active.');
      // যদি সিস্টেম কোনো কারণে লকটি ছেড়ে দেয়, তাহলে ভ্যারিয়েবলটি রিসেট করা হবে
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        console.log('Screen Wake Lock was released.');
      });
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  } else {
    console.warn('Wake Lock API not supported.');
  }
};

// === Wake Lock বন্ধ করার জন্য নতুন ফাংশন ===
const releaseWakeLock = async () => {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
  }
};


// Functions
function hideLoadingScreen() {
    loadingOverlay.classList.add('hidden');
}

function loadVideo(videoUrl) {
    hls.destroy(); 
    hls = new Hls();
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else { 
        video.src = videoUrl; 
    }
}

function togglePlay() { 
    if (video.src) video.paused ? video.play() : video.pause(); 
}

function updatePlayState() {
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    
    if (video.paused) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playerContainer.classList.add('show-controls');
    } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playerContainer.classList.remove('show-controls');
    }
    
    playerContainer.classList.toggle('playing', !video.paused);
    playerContainer.classList.toggle('paused', video.paused);
}

// ... বাকি সব ফাংশন অপরিবর্তিত ...


// === পরিবর্তন এখানে (কন্ট্রোল বার দেখানোর নতুন নিয়ম) ===
function showTemporaryControls() {
    playerContainer.classList.add('show-controls');
    clearTimeout(controlsTimeout);
    
    if (!video.paused) {
        controlsTimeout = setTimeout(() => {
            playerContainer.classList.remove('show-controls');
        }, 3000);
    }
}

// Event Listeners
video.addEventListener('click', togglePlay);
video.addEventListener('mousemove', showTemporaryControls);
playerContainer.addEventListener('mouseleave', () => {
    if (!video.paused) {
        playerContainer.classList.remove('show-controls');
    }
});

// === পরিবর্তন এখানে ('play' এবং 'pause' ইভেন্ট) ===
video.addEventListener('play', () => {
    updatePlayState();
    requestWakeLock(); // ভিডিও প্লে হলে স্ক্রিন অন রাখার অনুরোধ
});

video.addEventListener('pause', () => {
    updatePlayState();
    releaseWakeLock(); // ভিডিও পজ হলে অনুরোধ বাতিল
});

video.addEventListener('ended', () => {
    releaseWakeLock(); // ভিডিও শেষ হলেও অনুরোধ বাতিল
});
// ===========================================

video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);

video.addEventListener('canplay', () => {
    updateProgressUI();
    updateBufferBar();
    updatePlayState();
});

video.addEventListener('volumechange', updateVolumeIcon);

centralPlayBtn.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', () => { if(video.duration) video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { if(video.duration) video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);
progressBar.addEventListener('input', scrub);
settingsBtn.addEventListener('click', toggleSettingsMenu);
closeSettingsBtn.addEventListener('click', toggleSettingsMenu);
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = option.dataset.speed;
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});

document.addEventListener('DOMContentLoaded', () => {
    updatePlayState();
    updateProgressUI();
    updateVolumeIcon();
    updateFullscreenState();

    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    
    if (videoUrl) {
        loadVideo(videoUrl);
        setTimeout(hideLoadingScreen, 3000);
    } else {
        hideLoadingScreen();
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
});

// === পরিবর্তন এখানে (ট্যাব পরিবর্তনের জন্য) ===
// ব্যবহারকারী অন্য ট্যাবে গেলে বা ব্রাউজার মিনিমাইজ করলে লকটি ছেড়ে দেওয়া হবে
// আবার ফিরে এলে এবং ভিডিও চলতে থাকলে লকটি আবার চালু করা হবে
document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'hidden') {
    await releaseWakeLock();
  } else if (document.visibilityState === 'visible' && !video.paused) {
    await requestWakeLock();
  }
});
