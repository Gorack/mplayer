function Player() {

	/**
	 * @type {HTMLAudioElement}
	 */
	this.player = document.getElementById('player');

	this.init();
}

Player.prototype = {

	init: function () {
		if (!this.player) {
			console.warn('Player HTML element not found!');

			return;
		}

		this.volumeElement = document.getElementById('volume');
		this.volumePercentElement = document.getElementById('volume-percent');

		this._setVolume(60);
		this.initPlaylist();
		this.addEventListeners();
	},

	addEventListeners: function() {
		const self = this;

		document.addEventListener('keydown', function (e) {

			if (!self.player.activeItem) {
				return;
			}

			const currentTime = self.player.currentTime;
			const duration = self.player.duration;

			switch (e.key) {
				case 'ArrowLeft':

					if (currentTime >= 6) {
						self.player.currentTime = currentTime - 5;
					} else {
						self.player.currentTime = 0;
					}

					break;

				case 'ArrowRight':

					if ((duration - currentTime) >= 6) {
						self.player.currentTime = currentTime + 5;
					}

					break;

				case 'ArrowUp':

					self._setVolume((self.player.volume * 100) + 5);

					break;

				case 'ArrowDown':

					self._setVolume((self.player.volume * 100) - 5);

					break;

				case 'PageUp':

					e.preventDefault();

					self.player.activeItem.playPrev();

					break;

				case 'PageDown':

					e.preventDefault();

					self.player.activeItem.playNext();

					break;
			}
		});

		this.player.addEventListener('ended', function (e) {
			self.player.activeItem.playNext();
		});

		this.volumeElement.parentElement.addEventListener('click', function (e) {

			const position = (e.offsetX / this.clientWidth * 100).toFixed(2);

			self._setVolume(position);
		});

		document.getElementById('forward').addEventListener('click', function () {
			if (self.player.activeItem) {
				self.player.activeItem.playNext();
			}
		});

		document.getElementById('backward').addEventListener('click', function () {
			if (self.player.activeItem) {
				self.player.activeItem.playPrev();
			}
		});

		document.getElementById('random').addEventListener('click', function () {
			this.classList.toggle('text-info');

			self.player.isRandom = !self.player.isRandom;
		});
	},

	initPlaylist: function () {
		const self = this;

		this.playlist = document.getElementById('playlist').querySelectorAll('a');

		this.playlist.forEach((node, index) => {
			const playIcon = document.createElement('i');
			const pauseIcon = document.createElement('i');
			const progress = document.createElement('div');
			const progressbar = document.createElement('div');
			const progressDuration = document.createElement('span');

			const setTimer = function() {
				node.timer = setInterval(function () {
					progressDuration.innerHTML = `${self._readableDuration(self.player.currentTime)} / ${self._readableDuration(self.player.duration)}`;

					progressbar.style.width = self.player.currentTime / self.player.duration * 100 + '%';
				}, 100);
			};

			playIcon.classList.add('fas', 'fa-play', 'mr-3');
			pauseIcon.classList.add('fas', 'fa-pause', 'mr-3');
			progress.classList.add('progress', 'mt-2');
			progressbar.classList.add('progress-bar', 'bg-dark');

			progress.append(progressbar);
			progress.append(progressDuration);

			// navigation with mouse
			progress.addEventListener('click', function (e) {
				const position = (e.offsetX / progress.clientWidth * 100).toFixed(2);

				self.player.currentTime = self.player.duration / 100 * position;
			});

			pauseIcon.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();

				self.player.pause();

				clearInterval(node.timer);

				pauseIcon.replaceWith(playIcon);
			});

			playIcon.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();

				if (node.isActive) {
					self.player.play();

					playIcon.replaceWith(pauseIcon);

					setTimer();
				} else {
					self._playMusic(node.href)
						.then(() => {
							playIcon.replaceWith(pauseIcon);

							node.isActive = true;

							node.after(progress);

							progressDuration.innerHTML = `${self._readableDuration(self.player.currentTime)} / ${self._readableDuration(self.player.duration)}`;

							setTimer();

							self.player.activeItem = node;
						});
				}
			});

			node.prepend(playIcon);

			node.title = node.innerText;

			node.index = index;

			node.reset = function () {

				node.isActive = false;

				if (node.contains(pauseIcon)) {
					pauseIcon.replaceWith(playIcon);
				}

				if (node.parentElement.contains(progress)) {
					node.parentElement.removeChild(progress);
				}

				clearTimeout(node.timer);

				progressbar.style.width = 0;
			};

			node.play = function () {
				playIcon.dispatchEvent(new Event('click'));
			};

			node.playRandom = function() {
				let randomIndex = self._getRandomPlaylistIndex();

				while (randomIndex === self.player.activeItem.index) {
					randomIndex = self._getRandomPlaylistIndex();
				}

				self.playlist[randomIndex].play();
			};

			node.playNext = function () {

				if (self.player.isRandom) {
					node.playRandom();

					return;
				}

				if (index === self.playlist.length - 1) {
					self.playlist[0].play();
				} else {
					self.playlist[index + 1].play();
				}
			};

			node.playPrev = function () {

				if (self.player.isRandom) {
					node.playRandom();

					return;
				}

				if (index === 0) {
					self.playlist[self.playlist.length - 1].play();
				} else {
					self.playlist[index - 1].play();
				}
			};
		});
	},

	_playMusic(path) {
		this.player.src = path;

		this.playlist.forEach(node => node.reset());

		this._setDisabledStateOfPlaylist(false);

		return this.player.play()
			.finally(() => {
				this._setDisabledStateOfPlaylist(true);

				return Promise.resolve();
			});
	},

	_setDisabledStateOfPlaylist: function (enable) {
		this.playlist.forEach(node => {
			if (enable) {
				node.parentElement.classList.remove('disabled');
			} else {
				node.parentElement.classList.add('disabled');
			}
		});
	},

	_readableDuration: function (seconds) {
		let sec = Math.floor(seconds);
		let min = Math.floor(sec / 60);

		min = min >= 10 ? min : '0' + min;
		sec = Math.floor(sec % 60);
		sec = sec >= 10 ? sec : '0' + sec;

		return min + ':' + sec;
	},

	_getRandomPlaylistIndex: function () {
		return Math.floor(Math.random() * this.playlist.length);
	},

	_setVolume: function (value) {
		value = Number(value);

		if (value > 100) {
			value = 100;
		}

		if (value < 0) {
			value = 0;
		}

		this.volumeElement.style.width = value + '%';

		this.volumePercentElement.innerText = value.toFixed(0) + '%';

		this.player.volume = value / 100;
	}

};

window.player = new Player();
