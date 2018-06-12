const viewer = document.getElementById('viewer');
const loading = document.getElementById('loading');

let containerWidth = 1000,
	containerMargin = 50,
	chapterGap = 40,
	chapter = 1,
	offset = 1,
	offsetRatioInChapter = 0.0,
	pagesInContainer = 1,
	chapterNum = 50,
	viewMode = 'page',
	chapters = {},
	firstChapter = 1,
	lastChapter = 2,
	isLoading = false,
	fullHeight = 0;


const restorePosition = () => {
	const c = getChapterInfo(chapter);
	const to = Math.round((offsetRatioInChapter * (viewMode === 'page' ? c.pages : c.height)) + c.offset);
	console.log(`offsetRatioInChapter: ${offsetRatioInChapter}, to: ${to}`);
	moveTo(to);
};
const setOffset = (_offset) => {
	offset = _offset;
	const c = getChapterInfo(chapter);
	offsetRatioInChapter = (offset - c.offset) / (viewMode === 'page' ? c.pages : c.height );
	console.log(`setOffset: ${_offset}, offsetRatioInChapter: ${offsetRatioInChapter}`);
};

const createChapterElement = num => {
	const chapterElem = document.createElement('div');
	chapterElem.className = 'chapter';
	chapterElem.id = `c${num}`;
	return chapterElem;
};

const loadChapter = (num) => {
	if (!chapters[num]) {
		chapters[num] = {
			chapter: num,
			uri: `./contents/${Math.floor(Math.random() * 4) + 1}.html`,
			title: `Title ${num}`
		};
	}

	return fetch(chapters[num].uri).then(response => response.text()).then(contents => {
		const chapterElem = createChapterElement(num);
		chapterElem.innerHTML = `<div class="contents"><h1>${chapters[num].title}</h1>${contents}</div>`;

		chapters[num].element = chapterElem;

		return chapters[num];
	});
};

const setIsLoading = (progress, max) => {
	isLoading = Number.isInteger(progress);
	if (isLoading) {
		loading.innerHTML = `Loading... ${Math.ceil((progress / (max ? max : chapterNum))  * 100)}%`;
	}
	loading.style.display = isLoading ? 'block' : 'none';
};

const setStyle = () => {
	let style = document.getElementById('override-style');
	if (!style) {
		style = document.createElement('style');
		style.id = 'override-style';
		document.head.appendChild(style);
	}

	if (viewMode === 'page') {
		document.body.className = 'page';
		viewer.style = '';
		const w = window.innerWidth;

		containerWidth = w - (containerMargin * 2);

		style.innerHTML = `
			.page .viewer { width: ${containerWidth}px; }
			.page .chapter { width: ${containerWidth}px; }
			.page .contents { column-gap: ${chapterGap}px; column-width: ${(containerWidth - (chapterGap * (pagesInContainer - 1))) / pagesInContainer}px; }
		`;
	} else {
		document.body.className = 'scroll';

		style.innerHTML = `
			.viewer { width: auto; }
			.chapter { width: 100%; }
			.contents { column-gap: unset; column-width: unset; }
		`;
	}
};

const renderChapters = async (startChap, endChap, withCalc = false) => {
	const viewerFrag = document.createDocumentFragment();
	const progressMax = withCalc ? chapterNum + (endChap - startChap + 1) : chapterNum;
	let progressedChap = 0;
	setIsLoading(progressedChap, progressMax);

	firstChapter = startChap = Math.max(1, startChap);
	lastChapter = endChap = Math.min(chapterNum, endChap);

	// [startChap, endChap]
	for (let i = startChap; i < endChap + 1; i++) {
		const chapterInfo = await loadChapter(i);

		console.log(chapterInfo);

		if (chapterInfo.offset && viewMode === 'scroll') {
			chapterInfo.element.style.top = `${chapterInfo.offset}px`;
		}
		viewerFrag.appendChild(chapterInfo.element);

		progressedChap += 1;
		setIsLoading(progressedChap, progressMax);
	}

	if (withCalc) {
		viewerFrag.appendChild(createChapterElement('last'));
	}
	
	// append chapters
	const newViewer = viewer.cloneNode();
	newViewer.appendChild(viewerFrag);
	viewer.innerHTML = newViewer.innerHTML;

	if (withCalc) {
		const calcDiv = document.getElementById('clast');
		let _offset = 0;
		for (let i = 1; i < chapterNum + 1; i++) {
			const chapterInfo = await loadChapter(i);
			const chapterElem = chapterInfo.element;

			calcDiv.innerHTML = chapterElem.innerHTML;

			if (viewMode === 'page') {
				const pages = Math.ceil(calcDiv.scrollWidth / (containerWidth + chapterGap));
				chapters[i].pages = pages;
			} else {
				chapters[i].height = calcDiv.scrollHeight;
			}

			chapterInfo.offset = _offset;

			
			if (i >= startChap && i <= endChap) {
				if (viewMode === 'scroll') {
					document.getElementById(`c${i}`).style.top = `${_offset}px`;
				}
			}

			_offset += viewMode === 'page' ? chapterInfo.pages : chapterInfo.height;

			progressedChap += 1;
			setIsLoading(progressedChap, progressMax);

		}
		calcDiv.innerHTML = '';

		if (viewMode === 'scroll') {
			fullHeight = _offset;
			viewer.style.height = `${fullHeight}px`;
		}
	}

	setIsLoading(false);
};

const init = async (mode) => {
	
	if (mode) {
		viewMode = mode;
	}
	
	setStyle();
	await renderChapters(firstChapter, lastChapter, true);
	
	setChapterInfo();
	setPageInfo();
	restorePosition();
};


const getChapterInfo = (chapterNum) => chapters[chapterNum];
const getChapterInfoByOffset = (offset) => Object.values(chapters).find((c) => {
	return offset > c.offset && offset <= c.offset + (viewMode === 'page' ? c.pages : c.height);
});

const setChapterInfo = () => document.getElementById('chapterInfo').innerHTML = `Chapter ${chapter} / ${chapterNum}`;
const setPageInfo = () => {
	const lastChapter = chapters[chapterNum - 1];
	const whole = (viewMode === 'page') ? (lastChapter.offset + lastChapter.pages) * pagesInContainer : lastChapter.offset + lastChapter.height;
	document.getElementById('pageInfo').innerHTML = `
		Position ${offset * (viewMode === 'page' ? pagesInContainer : 1)} (${(offsetRatioInChapter * 100).toFixed(2)}%)
		/ ${whole}
	`;
};
const getChapterElem = (num) => document.getElementById(`c${num}`);
const moveTo = async (_offset, goTo = true) => {
	const chapterInfo = getChapterInfoByOffset(_offset);
	if (chapterInfo) {
		if (chapter !== chapterInfo.chapter) {
			chapter = chapterInfo.chapter;
			await renderChapters(chapter - 1, chapter + 1);
		}
		setOffset(_offset);
		if (goTo) {
			if (viewMode === 'page') {
				viewer.scrollLeft = (chapter - firstChapter) * containerWidth;
				getChapterElem(chapter).scrollLeft = (offset - chapterInfo.offset - 1) * (containerWidth + chapterGap);
			} else {
				// TODO hmm...
				document.scrollingElement.scrollTop = offset - window.innerHeight;
			}
		}
		
		setChapterInfo();
		setPageInfo();
	}
};


function throttle(fn, limit = 100, delayed = false) {
  let inThrottle = false;
  return (...args) => {
    const context = this;
    if (!inThrottle) {
      if (delayed) {
        setTimeout(() => fn.apply(context, args), limit);
      } else {
        fn.apply(context, args);
      }
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

init();
let initialWindowWidth = window.innerWidth;
window.addEventListener('resize', () => {
	const w = window.innerWidth;
	if (w !== initialWindowWidth) {
		initialWindowWidth = w;
		init();
	}
});

document.getElementById('cp').addEventListener('click', () => {
	const c = getChapterInfo(chapter - 1);
	if (c) {
		moveTo(c.offset + 1);
	}
});
document.getElementById('cn').addEventListener('click', () => {
	const c = getChapterInfo(chapter + 1);
	if (c) {
		moveTo(c.offset + 1);
	}
});
document.getElementById('pp').addEventListener('click', () => moveTo(offset - 1));
document.getElementById('pn').addEventListener('click', () => moveTo(offset + 1));

document.getElementById('updateColumn').addEventListener('click', () => {
	pagesInContainer = parseInt(document.getElementById('pagesInContainer').value);
	chapterGap = parseInt(document.getElementById('chapterGap').value);
	init();
});
document.getElementById('scroll').addEventListener('click', () => init('scroll'));
document.getElementById('page').addEventListener('click', () => init('page'));

window.addEventListener('scroll', throttle(() => {
	if (viewMode === 'page') return;

	const currentY = document.scrollingElement.scrollTop;
	if (offset - window.innerHeight === currentY) {
		return;
	}
	const currentOffset = currentY + window.innerHeight;
	
	moveTo(currentOffset, false);

}, 500, true));
