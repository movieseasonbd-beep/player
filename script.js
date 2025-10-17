const playerContainer = document.querySelector('.player-container');
const video = document.querySelector('.video');
const centralPlayBtn = document.querySelector('.central-play-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const volumeBtn = document.getElementById('volume-btn');
const progressRange = document.querySelector('.progress-range'); // থাম্ব ছাড়া বারের জন্য
const progressFilled = document.querySelector('.progress-filled');
const bufferBar = document.querySelector('.buffer-bar');
const timeDisplay = document.querySelector('.time-display');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.querySelector('.settings-menu');
const closeSettingsBtn = settingsMenu.querySelector('.close-btn');
const speedOptions = settingsMenu.querySelectorAll('li');

function togglePlay() { if (video.src) video.paused ? video.play() : video.pause(); }

function updatePlayState() {
    const icon = playPauseBtn.querySelector('i');
    icon.className = video.paused ? 'fas fa-play' : 'fas fa-pause';
    playerContainer.classList.toggle('playing', !video.paused);
    playerContainer.classList.toggle('paused', video.paused);
}

function updateProgressUI() {
    const progressPercent = (video.currentTime / video.duration) * 100;
    progressFilled.style.width = `${progressPercent}%`;
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(totalDuration)}`;
}

function updateBufferBar() {
    if (video.buffered.length > 0) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPercent = (bufferEnd / video.duration) * 100;
        bufferBar.style.width = `${bufferPercent}%`;
    }
}

// থাম্ব ছাড়া প্রোগ্রেস বারের জন্য নতুন ফাংশন
function scrub(e) {
    const scrubTime = (e.offsetX / progressRange.offsetWidth) * video.duration;
    if (!isNaN(scrubTime)) {
        video.currentTime = scrubTime;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) seconds = 0;
    const date = new Date(seconds * 1000);
    const [hh, mm, ss] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(v => v.toString().padStart(2, '0'));
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toggleMute() { video.muted = !video.muted; }

function updateVolumeIcon() {
    const icon = volumeBtn.querySelector('i');
    icon.className = video.muted || video.volume === 0 ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else { document.exitFullscreen(); }
}

function updateFullscreenState() {
    const isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.classList.toggle('active', isFullscreen);
}

function toggleSettingsMenu() { settingsMenu.classList.toggle('active'); }

// Event Listeners
video.addEventListener('click', togglePlay);
video.addEventListener('play', updatePlayState);
video.addEventListener('pause', updatePlayState);
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);
video.addEventListener('canplay', () => { updateProgressUI(); updateBufferBar(); });
video.addEventListener('volumechange', updateVolumeIcon);

centralPlayBtn.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', () => { video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);

// থাম্ব ছাড়া প্রোগ্রেস বারের জন্য নতুন ইভেন্ট লিসেনার
let mousedown = false;
progressRange.addEventListener('click', scrub);
progressRange.addEventListener('mousedown', () => mousedown = true);
progressRange.addEventListener('mouseup', () => mousedown = false);
progressRange.addEventListener('mouseleave', () => mousedown = false);
progressRange.
